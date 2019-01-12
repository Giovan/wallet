/*
 * @project: TERA
 * @version: Development (beta)
 * @copyright: Yuriy Ivanov 2017-2019 [progr76@gmail.com]
 * @license: MIT (not for evil)
 * Web: http://terafoundation.org
 * GitHub: https://github.com/terafoundation/wallet
 * Twitter: https://twitter.com/terafoundation
 * Telegram: https://web.telegram.org/#/im?p=@terafoundation
*/

"use strict";
require("../dapp/dapp");
require("../dapp/accounts");
require("../dapp/smart");
require("../dapp/file");
require("../dapp/messager");
require("../dapp/names");
if(global.PROCESS_NAME === "MAIN" || global.PROCESS_NAME === "TX")
    require("./wallet");
module.exports = class CSmartContract extends require("./block-exchange")
{
    constructor(SetKeyPair, RunIP, RunPort, UseRNDHeader, bVirtual)
    {
        super(SetKeyPair, RunIP, RunPort, UseRNDHeader, bVirtual)
        this.BufHashTree = new RBTree(CompareArr)
        this.BufHashTree.LastAddNum = 0
    }
    AddBlockToHashTree(Block)
    {
        this.BufHashTree.LastAddNum = Block.BlockNum
        var arr = Block.arrContent;
        if(arr)
        {
            for(var i = 0; i < arr.length; i++)
            {
                var HASH = shaarr(arr[i]);
                this.BufHashTree.insert(HASH)
            }
        }
    }
    DeleteBlockFromHashTree(Block)
    {
        var arr = Block.arrContent;
        if(arr)
        {
            for(var i = 0; i < arr.length; i++)
            {
                var HASH = shaarr(arr[i]);
                this.BufHashTree.remove(HASH)
            }
        }
    }
    OnWriteBlock(Block)
    {
    }
    BlockProcessTX(Block)
    {
        if(Block.BlockNum < 1)
            return ;
        var COUNT_MEM_BLOCKS = 0;
        var NUM1 = 1240000;
        var NUM2 = 1400000;
        if(global.LOCAL_RUN)
        {
            NUM1 = 15
            NUM2 = 100
        }
        if(Block.BlockNum > global.BLOCKNUM_TICKET_ALGO)
        {
            NUM1 = 1000000000000
            NUM2 = 1000000000000
        }
        if(Block.BlockNum > NUM1)
        {
            COUNT_MEM_BLOCKS = 1
            if(Block.BlockNum > NUM2)
                COUNT_MEM_BLOCKS = 60
            if(this.BufHashTree.LastAddNum !== Block.BlockNum - 1)
            {
                this.BufHashTree.clear()
                for(var num = COUNT_MEM_BLOCKS; num >= 1; num--)
                {
                    var Block2 = this.ReadBlockDB(Block.BlockNum - num);
                    if(Block2)
                    {
                        this.AddBlockToHashTree(Block2)
                    }
                }
            }
        }
        for(var key in DApps)
        {
            DApps[key].OnWriteBlockStart(Block)
        }
        var BlockNum = Block.BlockNum;
        var arr = Block.arrContent;
        if(arr)
            for(var i = 0; i < arr.length; i++)
            {
                var HASH = shaarr(arr[i]);
                if(this.BufHashTree.find(HASH))
                {
                    continue;
                }
                var type = arr[i][0];
                var App = DAppByType[type];
                if(App)
                {
                    DApps.Accounts.BeginTransaction()
                    var StrHex = GetHexFromArr(sha3(arr[i]));
                    var item = global.TreeFindTX.LoadValue(StrHex);
                    global.CurTrItem = item
                    var Result = App.OnWriteTransaction(Block, arr[i], BlockNum, i);
                    if(item)
                    {
                        var ResultStr = Result;
                        if(Result === true)
                        {
                            ResultStr = "Add to blockchain"
                            if(type === global.TYPE_TRANSACTION_FILE)
                                ResultStr += ": file/" + BlockNum + "/" + i
                        }
                        ToLogClient(ResultStr, item, true)
                    }
                    if(Result === true)
                        DApps.Accounts.CommitTransaction(BlockNum, i)
                    else
                        DApps.Accounts.RollBackTransaction()
                    global.CurTrItem = undefined
                }
            }
        if(COUNT_MEM_BLOCKS)
        {
            var Block2 = this.ReadBlockDB(Block.BlockNum - COUNT_MEM_BLOCKS);
            if(Block2)
                this.DeleteBlockFromHashTree(Block2)
            this.AddBlockToHashTree(Block)
        }
        for(var key in DApps)
        {
            DApps[key].OnWriteBlockFinish(Block)
        }
    }
    BlockDeleteTX(Block)
    {
        this.BufHashTree.LastAddNum = 0
        for(var key in DApps)
        {
            DApps[key].OnDeleteBlock(Block)
        }
    }
    OnDelete(Block)
    {
    }
    IsValidTicket(Tr, BlockNum)
    {
        this.CheckCreateTicketObject(Tr, BlockNum)
        if(Tr.power < MIN_POWER_POW_TR)
            return  - 2;
        if(Tr.num !== BlockNum)
            return  - 3;
        return 1;
    }
    IsValidTransaction(Tr, BlockNum)
    {
        if(!Tr.body || Tr.body.length < MIN_TRANSACTION_SIZE || Tr.body.length > MAX_TRANSACTION_SIZE)
            return  - 1;
        this.CheckCreateTransactionObject(Tr)
        if(Tr.power - Math.log2(Tr.body.length / 128) < MIN_POWER_POW_TR)
            return  - 2;
        if(Tr.num !== BlockNum)
            return  - 3;
        if(Tr.body[0] === TYPE_TRANSACTION_ACC_HASH)
            return  - 4;
        return 1;
    }
    ReWriteDAppTransactions(Length)
    {
        if(!TX_PROCESS.Worker)
            return 0;
        if(!Length)
            return 0;
        var StartNum = this.BlockNumDB - Length + 1;
        if(StartNum < 0)
            StartNum = 0
        var EndNum = this.BlockNumDB;
        var MinBlock = DApps.Accounts.GetMinBlockAct();
        if(MinBlock > StartNum)
        {
            ToLog("Cant rewrite transactions. Very long length of the rewriting chain. Max length=" + (this.BlockNumDB - MinBlock))
            return 0;
        }
        TX_PROCESS.Worker.send({cmd:"ReWriteDAppTransactions", StartNum:StartNum, EndNum:EndNum})
        return 1;
    }
    AddDAppTransactions(BlockNum, Arr)
    {
        if(BlockNum % PERIOD_ACCOUNT_HASH !== 0)
            return ;
        var BlockNumHash = BlockNum - DELTA_BLOCK_ACCOUNT_HASH;
        if(BlockNumHash < 0)
            return ;
        var Hash = DApps.Accounts.GetHashOrUndefined(BlockNumHash);
        if(Hash)
        {
            var Body = [TYPE_TRANSACTION_ACC_HASH];
            WriteUintToArr(Body, BlockNumHash)
            WriteArrToArr(Body, Hash, 32)
            var Tr = {body:Body};
            this.CheckCreateTransactionObject(Tr)
            Arr.unshift(Tr)
        }
        else
        {
        }
    }
};
