import { BigNumber, ContractTransaction } from "ethers";
import { ethers, getNamedAccounts } from "hardhat"
import { IWeth } from "../typechain-types";

export const AMOUNT: BigNumber = ethers.utils.parseEther("0.02")

export async function getWeth() {

    const { deployer } = await getNamedAccounts();

    const iWeth: IWeth = await ethers.getContractAt(
        "IWeth", 
        "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2", 
        deployer
    )

    const tx: ContractTransaction = await iWeth.deposit({value: AMOUNT})
    await tx.wait(1)

    const balance: BigNumber = await iWeth.balanceOf(deployer)
    console.log(`Got ${balance.toString()} WETH`)
}
