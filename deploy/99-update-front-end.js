const { ethers, network } = require("hardhat")
const fs = require("fs")
const { frontEndAbiLocation, frontEndContractsFile } = require("../helper-hardhat-config")

module.exports = async () => {
    if (process.env.UPDATE_FRONT_END) {
        console.log("Writing to front end...")
        await updateContractAddresses()
        await updateAbi()
        console.log("Front end update completed!")
    }
}

async function updateAbi() {
    const paymentCore = await ethers.getContract("PaymentCore")
    fs.writeFileSync(
        `${frontEndAbiLocation}/PaymentCore.json`,
        paymentCore.interface.format(ethers.utils.FormatTypes.json)
    )
}

async function updateContractAddresses() {
    const chainId = network.config.chainId.toString()
    const paymentCore = await ethers.getContract("PaymentCore")

    const contractsFile = fs.existsSync(frontEndContractsFile)
        ? JSON.parse(fs.readFileSync(frontEndContractsFile, "utf8"))
        : {}

    if (chainId in contractsFile) {
        if (!contractsFile[chainId]["PaymentCore"].includes(paymentCore.address)) {
            contractsFile[chainId]["PaymentCore"].push(paymentCore.address)
        }
    } else {
        contractsFile[chainId] = {
            PaymentCore: [paymentCore.address],
        }
    }

    fs.writeFileSync(frontEndContractsFile, JSON.stringify(contractsFile))
}

module.exports.tags = ["all", "frontend"]
