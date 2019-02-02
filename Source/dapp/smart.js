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
const LOC_ADD_NAME = "$";
require("../HTML/JS/lexer.js");
global.TickCounter = 0;
const DBRow = require("../core/db/db-row");
const TYPE_TRANSACTION_SMART_CREATE = 130;
global.TYPE_TRANSACTION_SMART_RUN = 135;
const TYPE_TRANSACTION_SMART_CHANGE = 140;
global.FORMAT_SMART_CREATE = "{\
    Type:byte,\
    TokenGenerate:byte,\
    StartValue:uint,\
    OwnerPubKey:byte,\
    ISIN:str,\
    Zip:byte,\
    AccountLength:byte,\
    StateFormat:str,\
    Category1:byte,\
    Category2:byte,\
    Category3:byte,\
    Reserve:arr20,\
    IconBlockNum:uint,\
    IconTrNum:uint16,\
    ShortName:str5,\
    Name:str,\
    Description:str,\
    Code:str,\
    HTML:str,\
    }";
const WorkStructCreate = {};
global.FORMAT_SMART_CHANGE = "{\
    Type:byte,\
    Account:uint,\
    Smart:uint32,\
    Reserve:arr10,\
    FromNum:uint,\
    OperationID:uint,\
    Sign:arr64,\
    }";
const WorkStructChange = {};
global.FORMAT_SMART_RUN = "{\
    Type:byte,\
    Account:uint,\
    MethodName:str,\
    Params:str,\
    FromNum:uint,\
    OperationID:uint,\
    Reserve:arr10,\
    Sign:arr64,\
    }";
const WorkStructRun = {};
class SmartApp extends require("./dapp")
{
    constructor()
    {
        super()
        var bReadOnly = (global.PROCESS_NAME !== "TX");
        this.FORMAT_ROW = "{\
            Version:byte,\
            TokenGenerate:byte,\
            ISIN:str12,\
            Zip:byte,\
            BlockNum:uint,\
            TrNum:uint16,\
            IconBlockNum:uint,\
            IconTrNum:uint16,\
            ShortName:str5,\
            Name:str40,\
            Account:uint,\
            AccountLength:byte,\
            Category1:byte,\
            Category2:byte,\
            Category3:byte,\
            Owner:uint,\
            Reserve:arr20,\
            StateFormat:str,\
            Description:str,\
            Code:str,\
            HTML:str,\
            }"
        this.ROW_SIZE = 2 * (1 << 13)
        this.DBSmart = new DBRow("smart", this.ROW_SIZE, this.FORMAT_ROW, bReadOnly)
        this.InitHole()
        if(!bReadOnly)
            this.Start()
    }
    Start()
    {
        if(this.DBSmart.GetMaxNum() + 1 >= 7)
            return ;
        this.DBSmart.Write({Num:0, ShortName:"TERA", Name:"TERA", Description:"TERA", BlockNum:0, TokenGenerate:1, Account:0, Category1:0})
        for(var i = 1; i < 8; i++)
            this.DBSmart.Write({Num:i, ShortName:"", Name:"", Description:"", BlockNum:0, TokenGenerate:1, Account:i, Category1:0})
    }
    ClearDataBase()
    {
        this.DBSmart.Truncate( - 1)
        this.Start()
    }
    OnDeleteBlock(Block)
    {
        if(Block.BlockNum < 1)
            return ;
        this.DBSmart.DeleteHistory(Block.BlockNum)
    }
    OnWriteBlockStart(Block)
    {
        if(Block.BlockNum < 1)
            return ;
        this.OnDeleteBlock(Block)
    }
    OnWriteBlockFinish(Block)
    {
    }
    OnWriteTransaction(Block, Body, BlockNum, TrNum, ContextFrom)
    {
        var Type = Body[0];
        if(!ContextFrom)
        {
            DApps.Accounts.BeginTransaction()
        }
        var Result;
        try
        {
            switch(Type)
            {
                case TYPE_TRANSACTION_SMART_CREATE:
                    Result = this.TRCreateSmart(Block, Body, BlockNum, TrNum, ContextFrom)
                    break;
                case TYPE_TRANSACTION_SMART_RUN:
                    Result = this.TRRunSmart(Block, Body, BlockNum, TrNum, ContextFrom)
                    break;
                case TYPE_TRANSACTION_SMART_CHANGE:
                    Result = this.TRChangeSmart(Block, Body, BlockNum, TrNum, ContextFrom)
                    break;
            }
        }
        catch(e)
        {
            Result = e
        }
        return Result;
    }
    GetScriptTransaction(Body)
    {
        var Type = Body[0];
        var format;
        if(Type === TYPE_TRANSACTION_SMART_CREATE)
            format = FORMAT_SMART_CREATE
        else
            if(Type === TYPE_TRANSACTION_SMART_RUN)
                format = FORMAT_SMART_RUN
            else
                if(Type === TYPE_TRANSACTION_SMART_CHANGE)
                    format = FORMAT_SMART_CHANGE
        if(!format)
            return "";
        var TR = BufLib.GetObjectFromBuffer(Body, format, {});
        ConvertBufferToStr(TR)
        return JSON.stringify(TR, "", 2);
    }
    GetVerifyTransaction(BlockNum, TrNum, Body)
    {
        return 1;
    }
    TRCreateSmart(Block, Body, BlockNum, TrNum, ContextFrom)
    {
        if(!ContextFrom)
            return "Pay context required";
        if(Body.length < 31)
            return "Error length transaction (min size)";
        if(Body.length > 16000)
            return "Error length transaction (max size)";
        if(BlockNum < SMART_BLOCKNUM_START)
            return "Error block num";
        var TR = BufLib.GetObjectFromBuffer(Body, FORMAT_SMART_CREATE, WorkStructCreate);
        if(!TR.Name.trim())
            return "Name required";
        if(TR.AccountLength > 50)
            return "Error AccountLength=" + TR.AccountLength;
        if(TR.AccountLength < 1)
            TR.AccountLength = 1
        var AddAccount = TR.AccountLength - 1;
        var Price;
        if(TR.TokenGenerate)
            Price = PRICE_DAO(BlockNum).NewTokenSmart
        else
            Price = PRICE_DAO(BlockNum).NewSmart
        Price += AddAccount * PRICE_DAO(BlockNum).NewAccount
        if(!(ContextFrom && ContextFrom.To.length === 1 && ContextFrom.To[0].ID === 0 && ContextFrom.To[0].SumCOIN >= Price))
        {
            return "Not money in the transaction";
        }
        ContextFrom.ToID = ContextFrom.To[0].ID
        var Smart = TR;
        Smart.Version = 0
        Smart.Zip = 0
        Smart.BlockNum = BlockNum
        Smart.TrNum = TrNum
        Smart.Reserve = []
        Smart.Num = undefined
        Smart.Owner = ContextFrom.FromID
        this.DBSmart.CheckNewNum(Smart)
        var Account = DApps.Accounts.NewAccountTR(BlockNum, TrNum);
        Account.Value.Smart = Smart.Num
        Account.Name = TR.Name
        if(Smart.TokenGenerate)
        {
            Account.Currency = Smart.Num
            Account.Value.SumCOIN = TR.StartValue
        }
        if(TR.OwnerPubKey)
            Account.PubKey = ContextFrom.FromPubKey
        DApps.Accounts.WriteStateTR(Account, TrNum)
        for(var i = 0; i < AddAccount; i++)
        {
            var CurAccount = DApps.Accounts.NewAccountTR(BlockNum, TrNum);
            CurAccount.Value.Smart = Smart.Num
            CurAccount.Name = TR.Name
            if(Smart.TokenGenerate)
                CurAccount.Currency = Smart.Num
            if(TR.OwnerPubKey)
                CurAccount.PubKey = ContextFrom.FromPubKey
            DApps.Accounts.WriteStateTR(CurAccount, TrNum)
        }
        Smart.Account = Account.Num
        this.DBSmart.DeleteMap("EVAL" + Smart.Num)
        try
        {
            RunSmartMethod(Block, Smart, Account, BlockNum, TrNum, ContextFrom, "OnCreate")
        }
        catch(e)
        {
            this.DBSmart.DeleteMap("EVAL" + Smart.Num)
            return e;
        }
        this.DBSmart.Write(Smart)
        return true;
    }
    CheckSignFrom(Body, TR, BlockNum, TrNum)
    {
        var ContextFrom = {FromID:TR.FromNum};
        var AccountFrom = DApps.Accounts.ReadStateTR(TR.FromNum);
        if(!AccountFrom)
            return "Error account FromNum: " + TR.FromNum;
        if(TR.OperationID < AccountFrom.Value.OperationID)
            return "Error OperationID (expected: " + AccountFrom.Value.OperationID + " for ID: " + TR.FromNum + ")";
        var MaxCountOperationID = 100;
        if(BlockNum >= global.BLOCKNUM_TICKET_ALGO)
            MaxCountOperationID = 1000000
        if(TR.OperationID > AccountFrom.Value.OperationID + MaxCountOperationID)
            return "Error too much OperationID (expected max: " + (AccountFrom.Value.OperationID + MaxCountOperationID) + " for ID: " + TR.FromNum + ")";
        var hash = shabuf(Body.slice(0, Body.length - 64 - 12));
        var Result = 0;
        if(AccountFrom.PubKey[0] === 2 || AccountFrom.PubKey[0] === 3)
            try
            {
                Result = secp256k1.verify(hash, TR.Sign, AccountFrom.PubKey)
            }
            catch(e)
            {
            }
        if(!Result)
        {
            return "Error sign transaction";
        }
        if(BlockNum >= 13000000)
        {
            AccountFrom.Value.OperationID = TR.OperationID + 1
            DApps.Accounts.WriteStateTR(AccountFrom, TrNum)
        }
        else
            if(AccountFrom.Value.OperationID !== TR.OperationID)
            {
                AccountFrom.Value.OperationID = TR.OperationID
                DApps.Accounts.WriteStateTR(AccountFrom, TrNum)
            }
        return ContextFrom;
    }
    TRRunSmart(Block, Body, BlockNum, TrNum, ContextFrom)
    {
        if(Body.length < 100)
            return "Error length transaction (min size)";
        if(BlockNum < SMART_BLOCKNUM_START)
            return "Error block num";
        var TR = BufLib.GetObjectFromBuffer(Body, FORMAT_SMART_RUN, WorkStructRun);
        var Account = DApps.Accounts.ReadStateTR(TR.Account);
        if(!Account)
            return "RunSmart: Error account Num: " + TR.Account;
        if(!ContextFrom && TR.FromNum)
        {
            var ResultCheck = this.CheckSignFrom(Body, TR, BlockNum, TrNum);
            if(typeof ResultCheck === "string")
                return ResultCheck;
            ContextFrom = ResultCheck
        }
        try
        {
            var Params = JSON.parse(TR.Params);
            RunSmartMethod(Block, Account.Value.Smart, Account, BlockNum, TrNum, ContextFrom, TR.MethodName, Params, 1)
        }
        catch(e)
        {
            return e;
        }
        return true;
    }
    TRChangeSmart(Block, Body, BlockNum, TrNum, ContextFrom)
    {
        if(Body.length < 21)
            return "Error length transaction (min size)";
        if(BlockNum < SMART_BLOCKNUM_START)
            return "Error block num";
        var TR = BufLib.GetObjectFromBuffer(Body, FORMAT_SMART_CHANGE, WorkStructChange);
        if(!ContextFrom && TR.FromNum)
        {
            var ResultCheck = this.CheckSignFrom(Body, TR, BlockNum, TrNum);
            if(typeof ResultCheck === "string")
                return ResultCheck;
            ContextFrom = ResultCheck
        }
        if(TR.Smart > DApps.Smart.GetMaxNum())
            TR.Smart = 0
        if(ContextFrom.FromID !== TR.Account)
            return "ChangeSmart: Error account FromNum: " + TR.Account;
        var Account = DApps.Accounts.ReadStateTR(TR.Account);
        if(!Account)
            return "Error read account Num: " + TR.Account;
        if(BlockNum >= 13000000)
        {
            if(Account.Value.Smart === TR.Smart)
                return "The value has not changed";
        }
        if(Account.Value.Smart)
        {
            var Smart = this.ReadSmart(Account.Value.Smart);
            if(Smart.Account === TR.Account)
                return "Can't change base account";
            try
            {
                RunSmartMethod(Block, Account.Value.Smart, Account, BlockNum, TrNum, ContextFrom, "OnDeleteSmart")
            }
            catch(e)
            {
                return e;
            }
        }
        Account.Value.Smart = TR.Smart
        Account.Value.Data = []
        DApps.Accounts.WriteStateTR(Account, TrNum)
        if(Account.Value.Smart)
        {
            try
            {
                RunSmartMethod(Block, Account.Value.Smart, Account, BlockNum, TrNum, ContextFrom, "OnSetSmart")
            }
            catch(e)
            {
                return e;
            }
        }
        return true;
    }
    GetRows(start, count, Filter, Category, GetAllData, bTokenGenerate)
    {
        if(Filter)
        {
            Filter = Filter.trim()
            Filter = Filter.toUpperCase()
        }
        if(Category)
            Category = ParseNum(Category)
        var WasError = 0;
        var arr = [];
        var Data;
        for(var num = start; true; num++)
        {
            if(this.IsHole(num))
                continue;
            if(GetAllData)
                Data = this.ReadSmart(num)
            else
                Data = this.ReadSimple(num)
            if(!Data)
                break;
            if(bTokenGenerate && !Data.TokenGenerate)
                continue;
            if(Category)
            {
                if(Data.Category1 !== Category && Data.Category2 !== Category && Data.Category3 !== Category)
                    continue;
            }
            if(Filter)
            {
                var Str = "" + Data.ShortName.toUpperCase() + Data.ISIN.toUpperCase() + Data.Name.toUpperCase() + Data.Description.toUpperCase();
                if(Data.TokenGenerate)
                    Str += "TOKEN GENERATE"
                if(Str.indexOf(Filter) < 0)
                    continue;
            }
            arr.push(Data)
            count--
            if(count < 1)
                break;
        }
        return arr;
    }
    GetMaxNum()
    {
        return this.DBSmart.GetMaxNum();
    }
    ReadSmart(Num)
    {
        Num = ParseNum(Num)
        var Smart = this.DBSmart.GetMap("ITEM" + Num);
        if(!Smart)
        {
            Smart = this.DBSmart.Read(Num)
            if(Smart)
            {
                if(!Smart.WorkStruct)
                    Smart.WorkStruct = {}
                this.DBSmart.SetMap("ITEM" + Num, Smart)
            }
        }
        return Smart;
    }
    ReadSimple(Num)
    {
        var Smart = this.DBSmart.GetMap("SIMPLE" + Num);
        if(!Smart)
        {
            Smart = this.DBSmart.Read(Num)
            if(Smart)
            {
                Smart.CodeLength = Smart.Code.length
                Smart.HTMLLength = Smart.HTML.length
                Smart.Code = undefined
                Smart.HTML = undefined
                this.DBSmart.SetMap("SIMPLE" + Num, Smart)
            }
        }
        return Smart;
    }
    InitHole()
    {
        if(global.LOCAL_RUN || global.TEST_NETWORK)
            this.RowHole = {}
        else
            this.RowHole = {"19":1, "22":1, "23":1, "24":1, "26":1, "27":1, "30":1}
    }
    IsHole(num)
    {
        if(global.ALL_VIEW_ROWS)
            return 0;
        return this.RowHole[num];
    }
};

function GetParsing(Str)
{
    LexerJS.ParseCode(Str);
    var Code = LexerJS.stream;
    for(var key in LexerJS.FunctionMap)
    {
        Code += ";\nfunclist." + key + "=" + LOC_ADD_NAME + key;
    }
    for(var key in LexerJS.ExternMap)
    {
        Code += ";\npublist." + key + "=" + LOC_ADD_NAME + key;
    }
    Code += "\n\
    var context;\
    funclist.SetContext=function(cont){context=cont;};\
    ";
    return Code;
};

function GetSmartEvalContext(Smart)
{
    var EvalContext = DApps.Smart.DBSmart.GetMap("EVAL" + Smart.Num);
    if(0)
        if(Smart.Num === 26)
        {
            const fs = require("fs");
            var Path = "./dapp-smart/test-test.js";
            Smart.Code = fs.readFileSync(Path, {encoding:"utf8"});
            EvalContext = undefined;
        }
    if(!EvalContext)
    {
        var CodeLex = GetParsing(Smart.Code);
        var publist = {};
        var funclist = {};
        eval(CodeLex);
        EvalContext = {publist:publist, funclist:funclist};
        for(var key in funclist)
        {
            Object.freeze(funclist[key]);
        }
        Object.freeze(funclist);
        Object.freeze(publist);
        DApps.Smart.DBSmart.SetMap("EVAL" + Smart.Num, EvalContext);
    }
    return EvalContext;
};
var RunContext = undefined;
global.RunSmartMethod = RunSmartMethod;

function RunSmartMethod(Block,SmartOrSmartID,Account,BlockNum,TrNum,PayContext,MethodName,Params,bPublic)
{
    var Smart = SmartOrSmartID;
    if(typeof SmartOrSmartID === "number")
    {
        Smart = DApps.Smart.ReadSmart(SmartOrSmartID);
        if(!Smart)
        {
            if(bPublic)
                throw "Smart does not exist. Error id number: " + SmartOrSmartID;
            else
                return ;
        }
    }
    var EvalContext = GetSmartEvalContext(Smart);
    if(!EvalContext.funclist[MethodName] || (bPublic && !EvalContext.publist[MethodName]))
    {
        if(bPublic)
            throw "Method '" + MethodName + "' not found in smart contract";
        else
            return ;
    }
    var context = {};
    if(PayContext)
    {
        context.BlockNum = BlockNum;
        context.BlockHash = CopyArr(Block.Hash);
        context.BlockAddrHash = CopyArr(Block.AddrHash);
        context.TrNum = TrNum;
        context.Account = GET_ACCOUNT(Account);
        context.Smart = GET_SMART(Smart);
        context.FromNum = PayContext.FromID;
        context.ToNum = PayContext.ToID;
        context.Description = PayContext.Description;
        if(PayContext.Value)
            context.Value = {SumCOIN:PayContext.Value.SumCOIN, SumCENT:PayContext.Value.SumCENT};
    }
    var LocalRunContext = {Block:Block, Smart:Smart, Account:Account, BlockNum:BlockNum, TrNum:TrNum, context:context};
    var RetValue;
    var _RunContext = RunContext;
    RunContext = LocalRunContext;
    EvalContext.funclist.SetContext(RunContext.context);
    try
    {
        RetValue = EvalContext.funclist[MethodName](Params);
    }
    catch(e)
    {
        throw e;
    }
    finally
    {
        RunContext = _RunContext;
    }
    return RetValue;
};

function GET_ACCOUNT(Obj)
{
    let Data = Obj;
    var GET_PROP = {get Num()
        {
            return Data.Num;
        }, get Currency()
        {
            return Data.Currency;
        }, get PubKey()
        {
            return CopyArr(Data.PubKey);
        }, get Name()
        {
            return Data.Name;
        }, get BlockNumCreate()
        {
            return Data.BlockNumCreate;
        }, get Adviser()
        {
            return Data.Adviser;
        }, get Smart()
        {
            return Data.Smart;
        }, get Value()
        {
            return {SumCOIN:Data.Value.SumCOIN, SumCENT:Data.Value.SumCENT, OperationID:Data.Value.OperationID, Smart:Data.Value.Smart};
        }, };
    return GET_PROP;
};

function GET_SMART(Obj)
{
    let Data = Obj;
    var GET_PROP = {get Num()
        {
            return Data.Num;
        }, get Version()
        {
            return Data.Version;
        }, get TokenGenerate()
        {
            return Data.TokenGenerate;
        }, get ISIN()
        {
            return Data.ISIN;
        }, get Zip()
        {
            return Data.Zip;
        }, get BlockNum()
        {
            return Data.BlockNum;
        }, get TrNum()
        {
            return Data.TrNum;
        }, get IconBlockNum()
        {
            return Data.IconBlockNum;
        }, get IconTrNum()
        {
            return Data.IconTrNum;
        }, get ShortName()
        {
            return Data.ShortName;
        }, get Name()
        {
            return Data.Name;
        }, get Description()
        {
            return Data.Description;
        }, get Account()
        {
            return Data.Account;
        }, get AccountLength()
        {
            return Data.AccountLength;
        }, get Owner()
        {
            return Data.Owner;
        }, get Code()
        {
            return Data.Code;
        }, get HTML()
        {
            return Data.HTML;
        }, };
    return GET_PROP;
};

function InitEval()
{
    $Math.abs = function ()
    {
        DO(6);
        return Math.abs.apply(Math, arguments);
    };
    $Math.acos = function ()
    {
        DO(16);
        return Math.acos.apply(Math, arguments);
    };
    $Math.acosh = function ()
    {
        DO(9);
        return Math.acosh.apply(Math, arguments);
    };
    $Math.asin = function ()
    {
        DO(19);
        return Math.asin.apply(Math, arguments);
    };
    $Math.asinh = function ()
    {
        DO(32);
        return Math.asinh.apply(Math, arguments);
    };
    $Math.atan = function ()
    {
        DO(13);
        return Math.atan.apply(Math, arguments);
    };
    $Math.atanh = function ()
    {
        DO(30);
        return Math.atanh.apply(Math, arguments);
    };
    $Math.atan2 = function ()
    {
        DO(15);
        return Math.atan2.apply(Math, arguments);
    };
    $Math.ceil = function ()
    {
        DO(6);
        return Math.ceil.apply(Math, arguments);
    };
    $Math.cbrt = function ()
    {
        DO(22);
        return Math.cbrt.apply(Math, arguments);
    };
    $Math.expm1 = function ()
    {
        DO(18);
        return Math.expm1.apply(Math, arguments);
    };
    $Math.clz32 = function ()
    {
        DO(5);
        return Math.clz32.apply(Math, arguments);
    };
    $Math.cos = function ()
    {
        DO(12);
        return Math.cos.apply(Math, arguments);
    };
    $Math.cosh = function ()
    {
        DO(20);
        return Math.cosh.apply(Math, arguments);
    };
    $Math.exp = function ()
    {
        DO(16);
        return Math.exp.apply(Math, arguments);
    };
    $Math.floor = function ()
    {
        DO(7);
        return Math.floor.apply(Math, arguments);
    };
    $Math.fround = function ()
    {
        DO(6);
        return Math.fround.apply(Math, arguments);
    };
    $Math.hypot = function ()
    {
        DO(56);
        return Math.hypot.apply(Math, arguments);
    };
    $Math.imul = function ()
    {
        DO(3);
        return Math.imul.apply(Math, arguments);
    };
    $Math.log = function ()
    {
        DO(10);
        return Math.log.apply(Math, arguments);
    };
    $Math.log1p = function ()
    {
        DO(23);
        return Math.log1p.apply(Math, arguments);
    };
    $Math.log2 = function ()
    {
        DO(19);
        return Math.log2.apply(Math, arguments);
    };
    $Math.log10 = function ()
    {
        DO(16);
        return Math.log10.apply(Math, arguments);
    };
    $Math.max = function ()
    {
        DO(6);
        return Math.max.apply(Math, arguments);
    };
    $Math.min = function ()
    {
        DO(6);
        return Math.min.apply(Math, arguments);
    };
    $Math.pow = function ()
    {
        DO(40);
        return Math.pow.apply(Math, arguments);
    };
    $Math.round = function ()
    {
        DO(7);
        return Math.round.apply(Math, arguments);
    };
    $Math.sign = function ()
    {
        DO(5);
        return Math.sign.apply(Math, arguments);
    };
    $Math.sin = function ()
    {
        DO(10);
        return Math.sin.apply(Math, arguments);
    };
    $Math.sinh = function ()
    {
        DO(24);
        return Math.sinh.apply(Math, arguments);
    };
    $Math.sqrt = function ()
    {
        DO(6);
        return Math.sqrt.apply(Math, arguments);
    };
    $Math.tan = function ()
    {
        DO(13);
        return Math.tan.apply(Math, arguments);
    };
    $Math.tanh = function ()
    {
        DO(24);
        return Math.tanh.apply(Math, arguments);
    };
    $Math.trunc = function ()
    {
        DO(6);
        return Math.trunc.apply(Math, arguments);
    };
    $Math.random = function ()
    {
        DO(1);
        return 0;
    };
    Object.freeze($SetValue);
    Object.freeze($Send);
    Object.freeze($Move);
    Object.freeze($Event);
    Object.freeze($ReadAccount);
    Object.freeze($ReadState);
    Object.freeze($WriteState);
    Object.freeze($GetMaxAccount);
    Object.freeze($ADD);
    Object.freeze($SUB);
    Object.freeze($ISZERO);
    Object.freeze($FLOAT_FROM_COIN);
    Object.freeze($COIN_FROM_FLOAT);
    Object.freeze($COIN_FROM_STRING);
    Object.freeze($GetHexFromArr);
    Object.freeze($GetArrFromHex);
    Object.freeze($sha);
    Object.freeze($isFinite);
    Object.freeze($isNaN);
    Object.freeze($parseFloat);
    Object.freeze($parseInt);
    Object.freeze($parseUint);
    Object.freeze($String);
    Object.freeze($Number);
    Object.freeze($Boolean);
    var arr = Object.getOwnPropertyNames(JSON);
    for(var name of arr)
    {
        $JSON[name] = JSON[name];
    }
    FreezeObjectChilds($Math);
    Object.freeze($Math);
    FreezeObjectChilds($JSON);
    Object.freeze($JSON);
    FreezeObjectChilds(Number.prototype);
    FreezeObjectChilds(String.prototype);
    FreezeObjectChilds(Boolean.prototype);
    FreezeObjectChilds(Array.prototype);
    FreezeObjectChilds(Object.prototype);
};

function FreezeObjectChilds(Value)
{
    var arr = Object.getOwnPropertyNames(Value);
    for(var name of arr)
    {
        Object.freeze(Value[name]);
    }
};

function ChangePrototype()
{
    var Array_prototype_concat = Array.prototype.concat;
    var Array_prototype_toString = Array.prototype.toString;
    Array.prototype.concat = function ()
    {
        if(RunContext)
            throw "Error Access denied: concat";
        else
            return Array_prototype_concat.apply(this, arguments);
    };
    Array.prototype.toString = function ()
    {
        if(RunContext)
            throw "Error Access denied: toString";
        else
            return Array_prototype_toString.apply(this, arguments);
    };
    Array.prototype.toLocaleString = Array.prototype.toString;
    Number.prototype.toLocaleString = function ()
    {
        return this.toString();
    };
    String.prototype.toLocaleLowerCase = String.prototype.toLowerCase;
    String.prototype.toLocaleUpperCase = String.prototype.toUpperCase;
    var String_prototype_localeCompare = String.prototype.localeCompare;
    String.prototype.localeCompare = function ()
    {
        if(RunContext)
            throw "Error Access denied: localeCompare";
        else
            return String_prototype_localeCompare.apply(this, arguments);
    };
    var String_prototype_match = String.prototype.match;
    String.prototype.match = function ()
    {
        if(RunContext)
            throw "Error Access denied: match";
        else
            return String_prototype_match.apply(this, arguments);
    };
    var String_prototype_repeat = String.prototype.repeat;
    String.prototype.repeat = function ()
    {
        if(RunContext)
            throw "Error Access denied: repeat";
        else
            return String_prototype_repeat.apply(this, arguments);
    };
    var String_prototype_search = String.prototype.search;
    String.prototype.search = function ()
    {
        if(RunContext)
            throw "Error Access denied: search";
        else
            return String_prototype_search.apply(this, arguments);
    };
    var String_prototype_padStart = String.prototype.padStart;
    String.prototype.padStart = function ()
    {
        if(RunContext)
            throw "Error Access denied: padStart";
        else
            return String_prototype_padStart.apply(this, arguments);
    };
    var String_prototype_padEnd = String.prototype.padEnd;
    String.prototype.padEnd = function ()
    {
        if(RunContext)
            throw "Error Access denied: padEnd";
        else
            return String_prototype_padEnd.apply(this, arguments);
    };
    String.prototype.right = function (count)
    {
        if(this.length > count)
            return this.substr(this.length - count, count);
        else
            return this.substr(0, this.length);
    };
};
const MAX_LENGTH_STRING = 5000;
const $Math = {};
const $JSON = {};

function DO(Count)
{
    global.TickCounter -= Count;
    if(global.TickCounter < 0)
        throw new Error("Stop the execution code. The limit of ticks is over.");
};

function $SetValue(ID,CoinSum)
{
    DO(3000);
    ID = ParseNum(ID);
    if(!RunContext.Smart.TokenGenerate)
    {
        throw "The smart-contract is not token generate, access to change values is denied";
    }
    var ToData = DApps.Accounts.ReadStateTR(ID);
    if(!ToData)
    {
        throw "Account does not exist.Error id number: " + ID;
    }
    if(ToData.Currency !== RunContext.Smart.Num)
    {
        throw "The account currency does not belong to the smart-contract, access to change values is denied";
    }
    if(typeof CoinSum === "number")
    {
        CoinSum = COIN_FROM_FLOAT(CoinSum);
    }
    if(CoinSum.SumCENT >= 1e9)
    {
        throw "ERROR SumCENT>=1e9";
    }
    if(CoinSum.SumCOIN < 0 || CoinSum.SumCENT < 0)
    {
        throw "ERROR Sum<0";
    }
    ToData.Value.SumCOIN = Math.trunc(CoinSum.SumCOIN);
    ToData.Value.SumCENT = Math.trunc(CoinSum.SumCENT);
    DApps.Accounts.WriteStateTR(ToData, RunContext.TrNum);
    return true;
};

function $Send(ToID,CoinSum,Description)
{
    DO(3000);
    ToID = ParseNum(ToID);
    if(typeof CoinSum === "number")
        CoinSum = COIN_FROM_FLOAT(CoinSum);
    if(CoinSum.SumCENT >= 1e9)
    {
        throw "ERROR SumCENT>=1e9";
    }
    if(CoinSum.SumCOIN < 0 || CoinSum.SumCENT < 0)
    {
        throw "ERROR Sum<0";
    }
    var ToData = DApps.Accounts.ReadStateTR(ToID);
    if(RunContext.Account.Currency !== ToData.Currency)
    {
        throw "Different currencies";
    }
    DApps.Accounts.SendMoneyTR(RunContext.Block, RunContext.Account.Num, ToID, CoinSum, RunContext.BlockNum, RunContext.TrNum,
    Description, Description, 1);
};

function $Move(FromID,ToID,CoinSum,Description)
{
    DO(3000);
    FromID = ParseNum(FromID);
    ToID = ParseNum(ToID);
    var FromData = DApps.Accounts.ReadStateTR(FromID);
    var ToData = DApps.Accounts.ReadStateTR(ToID);
    if(FromData.Currency !== ToData.Currency)
    {
        throw "Different currencies";
    }
    if(FromData.Value.Smart !== RunContext.Smart.Num)
    {
        throw "The account smart does not belong to the smart-contract, access is denied";
    }
    if(typeof CoinSum === "number")
    {
        CoinSum = COIN_FROM_FLOAT(CoinSum);
    }
    if(CoinSum.SumCENT >= 1e9)
    {
        throw "ERROR SumCENT>=1e9";
    }
    if(CoinSum.SumCOIN < 0 || CoinSum.SumCENT < 0)
    {
        throw "ERROR Sum<0";
    }
    CoinSum.SumCOIN = Math.trunc(CoinSum.SumCOIN);
    CoinSum.SumCENT = Math.trunc(CoinSum.SumCENT);
    DApps.Accounts.SendMoneyTR(RunContext.Block, FromID, ToID, CoinSum, RunContext.BlockNum, RunContext.TrNum, Description, Description,
    1);
};

function $Event(Description)
{
    DO(50);
    DApps.Accounts.DBChanges.TREvent.push({Description:Description, Smart:RunContext.Smart.Num, Account:RunContext.Account.Num,
        BlockNum:RunContext.BlockNum, TrNum:RunContext.TrNum});
    if(global.DebugEvent)
        DebugEvent(Description);
    if(global.CurTrItem)
    {
        ToLogClient(Description, global.CurTrItem, false);
    }
};

function $ReadAccount(ID)
{
    DO(900);
    ID = ParseNum(ID);
    var Account = DApps.Accounts.ReadStateTR(ID);
    if(!Account)
        throw "Error read account Num: " + ID;
    return GET_ACCOUNT(Account);
};

function $ReadState(ID)
{
    DO(900);
    ID = ParseNum(ID);
    var Account = DApps.Accounts.ReadStateTR(ID);
    if(!Account)
        throw "Error read state account Num: " + ID;
    var Smart;
    if(Account.Value.Smart === RunContext.Smart.Num)
    {
        Smart = RunContext.Smart;
    }
    else
    {
        DO(100);
        var Smart = DApps.Smart.ReadSmart(Account.Value.Smart);
        if(!Smart)
        {
            throw "Error smart ID: " + Account.Value.Smart;
        }
    }
    var Data;
    if(Smart.StateFormat)
        Data = BufLib.GetObjectFromBuffer(Account.Value.Data, Smart.StateFormat, Smart.WorkStruct, 1);
    else
        Data = {};
    if(typeof Data === "object")
        Data.Num = ID;
    return Data;
};

function $WriteState(Obj,ID)
{
    DO(3000);
    if(ID === undefined)
        ID = Obj.Num;
    ID = ParseNum(ID);
    var Account = DApps.Accounts.ReadStateTR(ID);
    if(!Account)
        throw "Error write account Num: " + ID;
    var Smart = RunContext.Smart;
    if(Account.Value.Smart !== Smart.Num)
    {
        throw "The account does not belong to the smart-contract, access to change state is denied";
    }
    Account.Value.Data = BufLib.GetBufferFromObject(Obj, Smart.StateFormat, 80, Smart.WorkStruct, 1);
    DApps.Accounts.WriteStateTR(Account, RunContext.TrNum);
};

function $GetMaxAccount()
{
    DO(20);
    return DApps.Accounts.DBChanges.TRMaxAccount;
};

function $ADD(Coin,Value2)
{
    DO(5);
    return ADD(Coin, Value2);
};

function $SUB(Coin,Value2)
{
    DO(5);
    return SUB(Coin, Value2);
};

function $ISZERO(Coin)
{
    DO(5);
    if(Coin.SumCOIN === 0 && Coin.SumCENT === 0)
        return true;
    else
        return false;
};

function $FLOAT_FROM_COIN(Coin)
{
    DO(5);
    return FLOAT_FROM_COIN(Coin);
};

function $COIN_FROM_FLOAT(Sum)
{
    DO(20);
    return COIN_FROM_FLOAT(Sum);
};

function $COIN_FROM_STRING(Sum)
{
    DO(20);
    return COIN_FROM_STRING(Sum);
};

function $require(SmartNum)
{
    DO(2000);
    SmartNum = ParseNum(SmartNum);
    var Smart = DApps.Smart.ReadSmart(SmartNum);
    if(!Smart)
    {
        throw "Smart does not exist. Error id number: " + SmartNum;
    }
    var EvalContext = GetSmartEvalContext(Smart);
    EvalContext.funclist.SetContext(RunContext.context);
    return EvalContext.publist;
};

function $GetHexFromArr(Arr)
{
    DO(20);
    return GetHexFromArr(Arr);
};

function $GetArrFromHex(Str)
{
    DO(20);
    return GetArrFromHex(Str);
};

function $sha(Str)
{
    DO(1000);
    return shaarr(Str);
};

function $isFinite(a)
{
    DO(5);
    return isFinite(a);
};

function $isNaN(a)
{
    DO(5);
    return isNaN(a);
};

function $parseFloat(a)
{
    DO(10);
    var Num = parseFloat(a);
    if(!Num)
        Num = 0;
    if(isNaN(Num))
        Num = 0;
    return Num;
};

function $parseInt(a)
{
    DO(10);
    var Num = parseInt(a);
    if(!Num)
        Num = 0;
    if(isNaN(Num))
        Num = 0;
    return Num;
};

function $parseUint(a)
{
    DO(10);
    return ParseNum(a);
};

function $String(a)
{
    DO(5);
    return String(a);
};

function $Number(a)
{
    DO(5);
    return Number(a);
};

function $Boolean(a)
{
    DO(5);
    return Boolean(a);
};

function CHKL(Str)
{
    if(typeof Str === "string" && Str.length > MAX_LENGTH_STRING)
        throw new Error("Invalid string length:" + Str.length);
    return Str;
};
var BlockRandomInit;
var m_w = 123456789;
var m_z = 987654321;
var mask = 0xffffffff;

function MathRandom()
{
    DO(5);
    
function seed(i)
    {
        m_w = i;
        m_z = 987654321;
    };
    
function random()
    {
        m_z = (36969 * (m_z & 65535) + (m_z >> 16)) & mask;
        m_w = (18000 * (m_w & 65535) + (m_w >> 16)) & mask;
        var result = ((m_z << 16) + m_w) & mask;
        result /= 4294967296;
        return result + 0.5;
    };
    if(BlockRandomInit === RunContext.Block.BlockNum)
        return random();
    BlockRandomInit = RunContext.Block.BlockNum;
    RunContext.Block.Hash;
    return 0;
};
ChangePrototype();
InitEval();
module.exports = SmartApp;
var App = new SmartApp;
DApps["Smart"] = App;
DAppByType[TYPE_TRANSACTION_SMART_CREATE] = App;
DAppByType[TYPE_TRANSACTION_SMART_RUN] = App;
DAppByType[TYPE_TRANSACTION_SMART_CHANGE] = App;
