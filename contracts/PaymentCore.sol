// SPDX-License-Identifier: SEE LICENSE IN LICENSE
pragma solidity ^0.8.9;

error PaymentCore__PaymentAmountNotValid();
error PaymentCore__OrderAlreadyExist(uint256 orderId);
error PaymentCore__OrderNotExist(uint256 orderId);
error PaymentCore__ConfirmOrderNotAllowed(address callerAddress, uint256 orderId);
error PaymentCore__NoFundToWithdraw(address caller);
error PaymentCore__OrderNotPending(uint256 orderId);
error PaymentCore__CancelOrderNotAllowed(address caller, uint256 orderId);

contract PaymentCore {
    /* Type declarations */
    enum OrderStatus {
        PENDING,
        COMPLETED
    }

    struct OrderInfo {
        address merchantAddress;
        address customerAddress;
        //could be remove by relying on orderId
        bytes32 orderMeta;
        //keep tracking of order status
        OrderStatus orderStatus;
        uint256 amountPaid;
    }

    event OrderPlaced(
        uint256 indexed orderId,
        address indexed merchantAddress,
        address indexed customerAddress,
        uint256 amountPaid
    );

    event OrderConfirmed(uint256 indexed orderId);

    event WithdrawSuccessful(address indexed merchant, uint256 indexed proceeds);

    event OrderCanceled(uint256 indexed orderId);

    //contract admin
    address private immutable i_admin;

    //balance sheets: merchantId -> proceeds
    mapping(address => uint256) private s_merchantProceeds;

    //order lookup: orderId -> orderInfo
    mapping(uint256 => OrderInfo) private s_orders;

    modifier validOrder(uint256 orderId) {
        OrderInfo memory orderInfo = s_orders[orderId];
        if (orderInfo.merchantAddress != address(0)) {
            revert PaymentCore__OrderAlreadyExist(orderId);
        }
        _;
    }

    modifier orderExist(uint256 orderId) {
        OrderInfo memory orderInfo = s_orders[orderId];
        if (orderInfo.merchantAddress == address(0)) {
            revert PaymentCore__OrderNotExist(orderId);
        }
        _;
    }

    modifier orderPending(uint256 orderId) {
        OrderInfo memory orderInfo = s_orders[orderId];
        if (orderInfo.orderStatus != OrderStatus.PENDING) {
            revert PaymentCore__OrderNotPending(orderId);
        }
        _;
    }

    constructor() {
        i_admin = msg.sender;
    }

    //place order
    function placeOrder(
        uint256 orderId,
        address merchantAddress
    ) public payable validOrder(orderId) {
        if (msg.value == 0) {
            revert PaymentCore__PaymentAmountNotValid();
        }

        s_orders[orderId] = OrderInfo(
            merchantAddress,
            msg.sender,
            "",
            OrderStatus.PENDING,
            msg.value
        );

        emit OrderPlaced(orderId, merchantAddress, msg.sender, msg.value);
    }

    //confirm order & batch confirm to save gas
    function customerConfirmOrder(
        uint256 orderId
    ) public orderExist(orderId) orderPending(orderId) {
        OrderInfo memory orderInfo = s_orders[orderId];

        if (msg.sender != orderInfo.customerAddress) {
            revert PaymentCore__ConfirmOrderNotAllowed(msg.sender, orderId);
        }

        s_orders[orderId].orderStatus = OrderStatus.COMPLETED;
        s_merchantProceeds[orderInfo.merchantAddress] += orderInfo.amountPaid;

        emit OrderConfirmed(orderId);
    }

    //withdraw proceeds
    function withdrawProceeds() public {
        uint256 proceeds = s_merchantProceeds[msg.sender];

        if (proceeds <= 0) {
            revert PaymentCore__NoFundToWithdraw(msg.sender);
        }

        s_merchantProceeds[msg.sender] = 0;
        (bool success, ) = payable(msg.sender).call{value: proceeds}("");
        require(success, "Transer failed");

        emit WithdrawSuccessful(msg.sender, proceeds);
    }

    //cancel order & batch cancel to save gas
    function merchantCancelOrder(uint256 orderId) public orderExist(orderId) orderPending(orderId) {
        OrderInfo memory orderInfo = s_orders[orderId];

        if (msg.sender != orderInfo.merchantAddress) {
            revert PaymentCore__CancelOrderNotAllowed(msg.sender, orderId);
        }

        //mark order as completed after cancellation
        s_orders[orderId].orderStatus = OrderStatus.COMPLETED;

        (bool success, ) = payable(orderInfo.customerAddress).call{value: orderInfo.amountPaid}("");
        require(success, "Transer failed");

        emit OrderCanceled(orderId);
    }

    function getAdmin() public view returns (address) {
        return i_admin;
    }

    function getOrder(uint256 orderId) public view returns (OrderInfo memory) {
        return s_orders[orderId];
    }

    function getMerchantProceeds(address merchantAddress) public view returns (uint256) {
        return s_merchantProceeds[merchantAddress];
    }
}
