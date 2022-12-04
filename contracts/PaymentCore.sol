// SPDX-License-Identifier: SEE LICENSE IN LICENSE
pragma solidity ^0.8.9;

error PaymentCore__PaymentAmountNotValid();
error PaymentCore_OrderAlreadyExist(uint256 orderId);
error PaymentCore_OrderNotExist(uint256 orderId);
error PaymentCore__ConfirmOrderNotAllowed(address callerAddress, uint256 orderId);
error PaymentCore_NoFundToWithdraw(address caller);
error PaymentCore_OrderNotPending(uint256 orderId);
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

    //contract admin
    address private immutable i_admin;

    //balance sheets: merchantId -> proceeds
    mapping(address => uint256) private s_merchantProceeds;

    //order lookup: orderId -> orderInfo
    mapping(uint256 => OrderInfo) private s_orders;

    modifier validOrder(uint256 orderId) {
        OrderInfo memory orderInfo = s_orders[orderId];
        if (orderInfo.merchantAddress != address(0)) {
            revert PaymentCore_OrderAlreadyExist(orderId);
        }
        _;
    }

    modifier orderExist(uint256 orderId) {
        OrderInfo memory orderInfo = s_orders[orderId];
        if (orderInfo.merchantAddress == address(0)) {
            revert PaymentCore_OrderNotExist(orderId);
        }
        _;
    }

    modifier orderPending(uint256 orderId) {
        OrderInfo memory orderInfo = s_orders[orderId];
        if (orderInfo.orderStatus != OrderStatus.PENDING) {
            revert PaymentCore_OrderNotPending(orderId);
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
    }

    //withdraw proceeds
    function withdrawProceeds() public {
        uint256 proceeds = s_merchantProceeds[msg.sender];

        if (proceeds <= 0) {
            revert PaymentCore_NoFundToWithdraw(msg.sender);
        }

        s_merchantProceeds[msg.sender] = 0;
        (bool success, ) = payable(msg.sender).call{value: proceeds}("");
        require(success, "Transer failed");
    }

    //cancel order & batch cancel to save gas
    function merchantCancelOrder(uint256 orderId) public orderExist(orderId) orderPending(orderId) {
        OrderInfo memory orderInfo = s_orders[orderId];

        if (msg.sender != orderInfo.merchantAddress) {
            revert PaymentCore__CancelOrderNotAllowed(msg.sender, orderId);
        }

        (bool success, ) = payable(orderInfo.customerAddress).call{value: orderInfo.amountPaid}("");
        require(success, "Transer failed");
    }
}
