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
    })
})
