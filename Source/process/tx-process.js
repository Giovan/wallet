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

global.PROCESS_NAME = "TX";
const crypto = require('crypto');
const fs = require('fs');
require("../core/constant");
global.DATA_PATH = GetNormalPathString(global.DATA_PATH);
global.CODE_PATH = GetNormalPathString(global.CODE_PATH);
require("../core/library");
global.READ_ONLY_DB = 0;
var LastAlive = Date.now();
setTimeout(function ()
{
    setInterval(CheckAlive, 1000);
}, 20000);
setInterval(function ()
{
    process.send({cmd:"Alive"});
}, 1000);
setInterval(PrepareStatEverySecond, 1000);
process.send({cmd:"online", message:"OK"});
global.ToLogClient = function (Str,StrKey,bFinal)
{
    process.send({cmd:"ToLogClient", Str:"" + Str, StrKey:StrKey, bFinal:bFinal});
};
process.on('message', function (msg)
{
    LastAlive = Date.now();
    switch(msg.cmd)
    {
        case "ALive":
            break;
        case "Exit":
            process.exit(0);
            break;
        case "call":
            var Err = 0;
            var Ret;
            try
            {
                Ret = global[msg.Name](msg.Params);
            }
            catch(e)
            {
                Err = 1;
                Ret = "" + e;
            }
            if(msg.id)
                process.send({cmd:"retcall", id:msg.id, Err:Err, Params:Ret});
            break;
        case "FindTX":
            global.TreeFindTX.SaveValue(msg.TX, msg.TX);
            break;
        case "SetSmartEvent":
            global.TreeFindTX.SaveValue("Smart:" + msg.Smart, 1);
            break;
        case "RewriteAllTransactions":
            RewriteAllTransactions(msg);
            break;
        case "ReWriteDAppTransactions":
            ReWriteDAppTransactions(msg);
            break;
        case "Eval":
            EvalCode(msg.Code);
            break;
        default:
            break;
    }
});
global.SetStatMode = function (Val)
{
    global.STAT_MODE = Val;
    return global.STAT_MODE;
};

function CheckAlive()
{
    if(global.NOALIVE)
        return ;
    var Delta = Date.now() - LastAlive;
    if(Delta > 100 * 1000)
    {
        ToLog("TX-PROCESS: ALIVE TIMEOUT Stop and exit: " + Delta + "/" + global.CHECK_STOP_CHILD_PROCESS);
        process.exit(0);
        return ;
    }
};
process.on('uncaughtException', function (err)
{
    ToError(err.stack);
    ToLog(err.stack);
    TO_ERROR_LOG("TX-PROCESS", 777, err);
    ToLog("-----------------TX-PROCESS EXIT------------------");
    process.exit();
});
process.on('error', function (err)
{
    ToError("TX-PROCESS:\n" + err.stack);
    ToLog(err.stack);
});
global.HTTP_PORT_NUMBER = 0;
var CServerDB = require("../core/transaction-validator");
var KeyPair = crypto.createECDH('secp256k1');
KeyPair.setPrivateKey(Buffer.from([77, 77, 77, 77, 77, 77, 77, 77, 77, 77, 77, 77, 77, 77, 77, 77, 77, 77, 77, 77, 77, 77,
77, 77, 77, 77, 77, 77, 77, 77, 77, 77]));
global.SERVER = new CServerDB(KeyPair, undefined, undefined, false, true);
global.TreeFindTX = new STreeBuffer(30 * 1000, CompareItemHashSimple, "string");
setInterval(function ()
{
    if(SERVER)
        SERVER.ClearBufMap();
    global.BlockDB.CloseDBFile("block-header");
    global.BlockDB.CloseDBFile("block-body");
    DoTXProcess();
}, 10);
var BlockTree = new STreeBuffer(30 * 1000, CompareItemHashSimple, "number");
global.bShowDetail = 0;
var LastBlockNum = undefined;

function DoTXProcess()
{
    if(LastBlockNum === undefined)
        InitTXProcess();
    var BlockMin = FindMinimal();
    if(!BlockMin)
    {
        return ;
    }
    var StartTime = Date.now();
    var CountTX = 0;
    for(var Num = BlockMin.BlockNum; Num < BlockMin.BlockNum + 200; Num++)
    {
        var EndTime = Date.now();
        var Delta = EndTime - StartTime;
        if(Delta >= 1000)
            break;
        var Block = SERVER.ReadBlockDB(Num);
        if(!Block)
        {
            break;
        }
        if(!IsValidSumHash(Block))
        {
            break;
        }
        var Item = BlockTree.LoadValue(Block.BlockNum, 1);
        if(Item && CompareArr(Item.SumHash, Block.SumHash) === 0)
        {
            continue;
        }
        SERVER.BlockProcessTX(Block);
        if(Num % 100000 === 0)
            ToLog("CALC: " + Num);
        CountTX++;
        if(bShowDetail)
            ToLog("    CALC: " + Num + " SumHash: " + GetHexFromArr(Block.SumHash).substr(0, 12));
        BlockTree.SaveValue(Block.BlockNum, {BlockNum:Block.BlockNum, SumHash:Block.SumHash});
        LastBlockNum = Block.BlockNum;
    }
};

function FindMinimal()
{
    var MaxNumBlockDB = SERVER.GetMaxNumBlockDB();
    if(MaxNumBlockDB && MaxNumBlockDB < LastBlockNum)
    {
        LastBlockNum = MaxNumBlockDB - 1;
        BlockTree.Clear();
    }
    for(var Num = LastBlockNum; Num--; Num > 0)
    {
        var Block = SERVER.ReadBlockHeaderDB(Num);
        if(!Block)
        {
            continue;
        }
        if(!IsValidSumHash(Block))
        {
            continue;
        }
        if(Block.BlockNum % PERIOD_ACCOUNT_HASH === 0)
        {
            var Item = DApps.Accounts.GetAccountHashItem(Block.BlockNum);
            if(Item)
            {
                BlockTree.SaveValue(Block.BlockNum, Item);
            }
        }
        var Item = BlockTree.LoadValue(Block.BlockNum, 1);
        if(Item && CompareArr(Item.SumHash, Block.SumHash) === 0)
            return Block;
    }
    RewriteAllTransactions();
    Block = SERVER.ReadBlockHeaderDB(0);
    return Block;
};

function IsValidSumHash(Block)
{
    if(Block.BlockNum < 16)
        return 1;
    if(IsZeroArr(Block.SumHash))
        return 0;
    var PrevBlock = SERVER.ReadBlockHeaderDB(Block.BlockNum - 1);
    if(!PrevBlock)
        return 0;
    var SumHash2 = shaarr2(PrevBlock.SumHash, Block.Hash);
    if(CompareArr(SumHash2, Block.SumHash) === 0)
        return 1;
    return 0;
};

function InitTXProcess()
{
    var StateTX = DApps.Accounts.DBStateTX.Read(0);
    if(!StateTX)
    {
        LastBlockNum = 0;
        var MaxNum = DApps.Accounts.DBAccountsHash.GetMaxNum();
        if(MaxNum > 0)
        {
            var Item = DApps.Accounts.DBAccountsHash.Read(MaxNum);
            if(Item)
            {
                LastBlockNum = Item.BlockNum;
            }
        }
        ToLog("DETECT NEW VER on BlockNum=" + LastBlockNum);
        DApps.Accounts.DBStateTX.Write({Num:0, BlockNum:LastBlockNum});
    }
    StateTX = DApps.Accounts.DBStateTX.Read(0);
    LastBlockNum = StateTX.BlockNum;
    LastBlockNum = PERIOD_ACCOUNT_HASH * Math.trunc(LastBlockNum / PERIOD_ACCOUNT_HASH);
    if(LastBlockNum > 100)
    {
        LastBlockNum = 1 + LastBlockNum - 100;
    }
    if(LastBlockNum <= 0)
        RewriteAllTransactions();
    else
        ToLog("Start NUM = " + LastBlockNum);
    DApps.Accounts.CalcMerkleTree();
};

function RewriteAllTransactions()
{
    ToLog("*************RewriteAllTransactions");
    for(var key in DApps)
    {
        DApps[key].ClearDataBase();
    }
    LastBlockNum = 0;
    BlockTree.Clear();
    ToLog("Start num = " + LastBlockNum);
};

function ReWriteDAppTransactions(msg)
{
    var StartNum = msg.StartNum;
    var EndNum = msg.EndNum;
    ToLog("ReWriteDAppTransactions: " + StartNum + " - " + EndNum);
    BlockTree.Clear();
    if(StartNum < LastBlockNum)
        LastBlockNum = StartNum;
    ToLog("Start num = " + LastBlockNum);
};
global.EvalCode = function (Code)
{
    var Result;
    try
    {
        var ret = eval(Code);
        Result = JSON.stringify(ret, "", 4);
    }
    catch(e)
    {
        Result = "" + e;
    }
    return Result;
};
