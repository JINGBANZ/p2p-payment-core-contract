module.exports = async ({ getNamedAccounts, deployments, getChainId }) => {
    const { deploy, log } = deployments
    const { deployer } = await getNamedAccounts()
    log("-------------------------------")
    log("deploying payment core contract..")

    /**
     * function return a deployment object that contains the abi
     * as well as the deployed address for the contract
     * NOTE: it is not a variable we can excute function of contract
     */
    await deploy("PaymentCore", {
        from: deployer,
        args: [],
        log: true,
        waitConfirmations: 1,
    })

    log("-------------------------------")
}

module.exports.tags = ["all", "PaymentCore"]
