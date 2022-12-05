const { assert, expect } = require("chai")
const { ethers, deployments, getNamedAccounts } = require("hardhat")

describe("Payment Core Contract Uint test", function () {
    let paymentCore, deployer, customer1, customer2, merchant
    let customer1Contract, merchantContract
    const PRICE = ethers.utils.parseEther("1")

    beforeEach(async () => {
        ;({ deployer, customer1, customer2, merchant } = await getNamedAccounts())
        await deployments.fixture(["all"])
        paymentCore = await ethers.getContract("PaymentCore")

        //set up contract for each user
        customer1Contract = paymentCore.connect(await ethers.getSigner(customer1))
        merchantContract = paymentCore.connect(await ethers.getSigner(merchant))
    })

    describe("constructor", () => {
        it("set admin correctly", async function () {
            const admin = await paymentCore.getAdmin()
            assert.equal(admin.toString(), deployer)
        })
    })

    describe("place order", () => {
        it("place order successfully", async () => {
            await customer1Contract.placeOrder(1, merchant, { value: PRICE })
            let order
            expect((order = await customer1Contract.getOrder(1))).to.emit("OrderPlaced")
            assert(order.merchantAddress.toString() == merchant)
            assert(order.customerAddress.toString() == customer1)
        })

        it("not a valid order", async () => {
            await customer1Contract.placeOrder(1, merchant, { value: PRICE })
            await expect(customer1Contract.placeOrder(1, merchant, { value: PRICE }))
                .to.be.revertedWithCustomError(customer1Contract, "PaymentCore__OrderAlreadyExist")
                .withArgs(1)
        })

        it("not enough money sent", async () => {
            await expect(customer1Contract.placeOrder(1, merchant)).to.be.revertedWithCustomError(
                customer1Contract,
                "PaymentCore__PaymentAmountNotValid"
            )
        })
    })

    describe("customer confirm order", () => {
        it("confirm order successfully", async () => {
            await customer1Contract.placeOrder(1, merchant, { value: PRICE })
            await expect(customer1Contract.customerConfirmOrder(1))
                .to.emit(customer1Contract, "OrderConfirmed")
                .withArgs(1)

            const order = await customer1Contract.getOrder(1)
            assert(order.orderStatus.toString() == 1)

            const proceeds = await customer1Contract.getMerchantProceeds(merchant)
            expect(proceeds).to.equal(PRICE)
        })

        it("order not exist", async () => {
            await expect(customer1Contract.customerConfirmOrder(1)).to.revertedWithCustomError(
                customer1Contract,
                "PaymentCore__OrderNotExist"
            )
        })

        it("confirm order is only allowed when order is pending", async () => {
            await customer1Contract.placeOrder(1, merchant, { value: PRICE })
            await customer1Contract.customerConfirmOrder(1)

            await expect(customer1Contract.customerConfirmOrder(1))
                .to.revertedWithCustomError(customer1Contract, "PaymentCore__OrderNotPending")
                .withArgs(1)
        })

        it("only allow customer themself to confirm their own order", async () => {
            await customer1Contract.placeOrder(1, merchant, { value: PRICE })

            await expect(merchantContract.customerConfirmOrder(1))
                .to.revertedWithCustomError(
                    customer1Contract,
                    "PaymentCore__ConfirmOrderNotAllowed"
                )
                .withArgs(merchant, 1)
        })
    })

    describe("withdraw proceeds", () => {
        it("withdraw successful", async () => {
            await customer1Contract.placeOrder(1, merchant, { value: PRICE })
            await customer1Contract.customerConfirmOrder(1)

            await expect(merchantContract.withdrawProceeds())
                .to.emit(merchantContract, "WithdrawSuccessful")
                .withArgs(merchant, PRICE)
                .to.changeEtherBalance(merchant, PRICE.toString())

            const remainingProceeds = await merchantContract.getMerchantProceeds(merchant)
            expect(remainingProceeds).to.equal(0)
        })

        it("no fund to withdraw", async () => {
            await expect(merchantContract.withdrawProceeds())
                .to.revertedWithCustomError(merchantContract, "PaymentCore__NoFundToWithdraw")
                .withArgs(merchant)
        })
    })

    describe("merchant cancel order", () => {
        it("cancel order success", async () => {
            await customer1Contract.placeOrder(1, merchant, { value: PRICE })
            await expect(merchantContract.merchantCancelOrder(1))
                .to.emit(merchantContract, "OrderCanceled")
                .withArgs(1)
                .to.changeEtherBalance(customer1, PRICE.toString())

            const order = await merchantContract.getOrder(1)
            assert(order.orderStatus.toString() == 1)
        })

        it("can only cancel order when pending", async () => {
            await customer1Contract.placeOrder(1, merchant, { value: PRICE })
            await merchantContract.merchantCancelOrder(1)

            await expect(merchantContract.merchantCancelOrder(1))
                .to.revertedWithCustomError(merchantContract, "PaymentCore__OrderNotPending")
                .withArgs(1)
        })

        it("can only cancel exist order", async () => {
            await expect(merchantContract.merchantCancelOrder(1))
                .to.revertedWithCustomError(merchantContract, "PaymentCore__OrderNotExist")
                .withArgs(1)
        })

        it("only merchant can cancel order", async () => {
            await customer1Contract.placeOrder(1, merchant, { value: PRICE })
            await expect(customer1Contract.merchantCancelOrder(1))
                .to.revertedWithCustomError(merchantContract, "PaymentCore__CancelOrderNotAllowed")
                .withArgs(customer1, 1)
        })
    })
})
