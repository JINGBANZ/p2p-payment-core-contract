require("@nomicfoundation/hardhat-toolbox")
require("@nomiclabs/hardhat-ethers")
require("hardhat-deploy")
require("dotenv").config()

COINMARKETCAP_KEY = process.env.COINMARKETCAP_KEY || ""

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
    defaultNetwork: "hardhat",
    networks: {
        hardhat: {
            chainId: 31337,
        },
        localhost: {
            chainId: 31337,
        },
    },
    namedAccounts: {
        deployer: {
            default: 0,
        },
        customer1: {
            default: 1,
        },
        customer2: {
            default: 2,
        },
        merchant: {
            default: 3,
        },
    },
    gasReporter: {
        enabled: true,
        currency: "USD",
        outputFile: "gas-report.txt",
        noColors: true,
        coinmarketcap: COINMARKETCAP_KEY,
        token: "ETH", //MATIC ETH
        // gasPriceApi: "https://api.polygonscan.com/api?module=proxy&action=eth_gasPrice",
    },
    solidity: "0.8.9",
    //reduce gas cost
    settings: {
        optimizer: {
            // Toggles whether the optimizer is on or off.
            // It's good to keep it off for development
            // and turn on for when getting ready to launch.
            enabled: true,
            // The number of runs specifies roughly how often
            // the deployed code will be executed across the
            // life-time of the contract.
            runs: 300,
        },
    },
}
