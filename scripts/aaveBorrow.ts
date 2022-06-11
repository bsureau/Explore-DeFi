import { getWeth, AMOUNT } from "./getWeth"
import { ethers, getNamedAccounts } from 'hardhat'
import { Address } from "hardhat-deploy/dist/types"
import { AggregatorV3Interface, IERC20, ILendingPool, ILendingPoolAddressesProvider } from "../typechain-types"
import { BigNumber, ContractTransaction } from 'ethers';

async function main() {
    
    const { deployer } = await getNamedAccounts()

    // Get fake WETH
    await getWeth()
    
    // Deposit WETH in Lending Pool in order to use them as collateral
    const lendingPool: ILendingPool = await getLendingPool(deployer)
    const wethContractAddress: Address = "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2"
    await approveErc20(
        wethContractAddress, 
        lendingPool.address, 
        AMOUNT.toString(), 
        deployer
    )
    lendingPool.deposit(
        wethContractAddress, 
        AMOUNT,
        deployer, 
        0
    )
    console.log("Deposited!")

    // Borrow 
    let borrowReturnData: BigNumber[] = await getBorrowUserData(lendingPool, deployer)
    let availableBorrowsETH: BigNumber = borrowReturnData[0]
    const daiPrice: BigNumber = await getDaiPrice()
    const amountDaiToBorrow: BigNumber = availableBorrowsETH.div(daiPrice)
    console.log(`You can borrow ${amountDaiToBorrow.toString()} DAI`)
    const amountDaiToBorrowWei = ethers.utils.parseEther(amountDaiToBorrow.toString())
    await borrowDai(
        "0x6b175474e89094c44da98b954eedeac495271d0f",
        lendingPool,
        amountDaiToBorrowWei.toString(),
        deployer
    )
    await getBorrowUserData(lendingPool, deployer)

    // Repay
    await repay(
        amountDaiToBorrowWei.toString(),
        "0x6b175474e89094c44da98b954eedeac495271d0f",
        lendingPool,
        deployer
    )
    await getBorrowUserData(lendingPool, deployer)
}

async function repay(
    amount: string, 
    daiAddress: string, 
    lendingPool: ILendingPool, 
    account: Address
) {

    await approveErc20(
        daiAddress, 
        lendingPool.address, 
        amount, 
        account
    )
    const repayTx: ContractTransaction = await lendingPool.repay(
        daiAddress, 
        amount, 
        1, 
        account
    )
    await repayTx.wait(1)
    console.log("Repaid!")
}

async function borrowDai(
    daiAddress:string, 
    lendingPool: ILendingPool,
     amountDaiToBorrow: string, 
     account: Address
) {

    const borrowTx: ContractTransaction = await lendingPool.borrow(
        daiAddress, 
        amountDaiToBorrow, 
        1, 
        0, 
        account
    )
    await borrowTx.wait(1)
    console.log("You've borrowed!")
}

async function getDaiPrice() : Promise<BigNumber> {

    const daiPriceFeed: AggregatorV3Interface = await ethers.getContractAt(
        "AggregatorV3Interface", 
        "0x773616E4d11A78F511299002da57A0a94577F1f4"
    )
    const price: BigNumber = (await daiPriceFeed.latestRoundData())[1]
    console.log(`The DAI/ETH price is ${price.toString()}`)
    return price
}


async function getBorrowUserData(
    lendingPool: ILendingPool, 
    account: Address
) : Promise<BigNumber[]> {

    const { 
        totalCollateralETH,
        totalDebtETH,
        availableBorrowsETH 
    } = await lendingPool.getUserAccountData(account);
    console.log(`You have ${totalCollateralETH} worth of ETH deposited.`)
    console.log(`You have ${totalDebtETH} worth of ETH borrowed.`)
    console.log(`You can borrow ${availableBorrowsETH} worth of ETH.`)
    return [availableBorrowsETH, totalDebtETH ]
}

async function approveErc20(
    erc20Address: string, 
    spenderAddress: string, 
    amountToSpend: string, 
    account: Address
) {
    const erc20Token: IERC20 = await ethers.getContractAt(
        "IERC20", 
        erc20Address, 
        account
    )

    const tx : ContractTransaction = await erc20Token.approve(spenderAddress, amountToSpend)
    await tx.wait(1)
    console.log("Approved!")
}

async function getLendingPool(account: Address): Promise<ILendingPool> {
    
    const lendingPoolAddressesProvider: ILendingPoolAddressesProvider = await ethers.getContractAt(
        "ILendingPoolAddressesProvider", 
        "0xB53C1a33016B2DC2fF3653530bfF1848a515c8c5", 
        account
    )

    const lendingPoolAddress: Address = await lendingPoolAddressesProvider.getLendingPool();
    const lendingPool: ILendingPool = await ethers.getContractAt(
        "ILendingPool", 
        lendingPoolAddress, 
        account 
    )

    return lendingPool;
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.log(error)
        process.exit(1)
    })
