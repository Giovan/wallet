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
const fs = require('fs');
const DBRow = require("../core/db/db-row");
const MAX_SUM_TER = 1e9;
const MAX_SUM_CENT = 1e9;
const TYPE_TRANSACTION_CREATE = 100;
const TYPE_TRANSACTION_TRANSFER = 105;
const TYPE_TRANSACTION_TRANSFER2 = 110;
const TYPE_TRANSACTION_TRANSFER3 = 111;
global.TYPE_TRANSACTION_ACC_HASH = 119;
global.FORMAT_CREATE = "{\
    Type:byte,\
    Currency:uint,\
    PubKey:arr33,\
    Name:str40,\
    Adviser:uint,\
    Smart:uint32,\
    Reserve:arr3,\
    }";
global.FORMAT_MONEY_TRANSFER = '{\
    Type:byte,\
    Currency:uint,\
    FromID:uint,\
    To:[{ID:uint,SumCOIN:uint,SumCENT:uint32}],\
    Description:str,\
    OperationID:uint,\
    Sign:arr64,\
    }';
const WorkStructTransfer = {};
global.FORMAT_MONEY_TRANSFER_BODY = FORMAT_MONEY_TRANSFER.replace("Sign:arr64,", "");
global.FORMAT_MONEY_TRANSFER2 = "{\
    Type:byte,\
    Version:byte,\
    Currency:uint,\
    FromID:uint,\
    To:[{ID:uint,SumCOIN:uint,SumCENT:uint32}],\
    Description:str,\
    OperationID:uint,\
    Sign:arr64,\
    }";
const WorkStructTransfer2 = {};
global.FORMAT_MONEY_TRANSFER_BODY2 = FORMAT_MONEY_TRANSFER2.replace("Sign:arr64,", "");
global.FORMAT_MONEY_TRANSFER3 = "{\
    Type:byte,\
    Version:byte,\
    Reserve:uint,\
    FromID:uint,\
    To:[{PubKey:tr,ID:uint,SumCOIN:uint,SumCENT:uint32}],\
    Description:str,\
    OperationID:uint,\
    Body:tr,\
    Sign:arr64,\
    }";
const WorkStructTransfer3 = {};
global.FORMAT_MONEY_TRANSFER_BODY3 = FORMAT_MONEY_TRANSFER3.replace("Sign:arr64,", "");
global.FORMAT_ACCOUNT_HASH = "{\
    Type:byte,\
    BlockNum:uint,\
    Hash:buffer32,\
    }";
class MerkleDBRow extends DBRow
{
    constructor(FileName, DataSize, Format, bReadOnly)
    {
        super(FileName, DataSize, Format, bReadOnly)
        this.MerkleTree
        this.MerkleArr = []
        this.MerkleCalc = {}
    }
    CalcMerkleTree(bForceUpdate)
    {
        if(!this.MerkleTree || bForceUpdate)
        {
            this.MerkleCalc = {}
            this.MerkleTree = {LevelsHash:[this.MerkleArr], RecalcCount:0}
            for(var num = 0; num <= this.GetMaxNum(); num++)
            {
                var Buf = this.Read(num, 1);
                this.MerkleArr[num] = shaarr(Buf)
                this.MerkleCalc[num] = 1
            }
        }
        this.MerkleTree.RecalcCount = 0
        UpdateMerklTree(this.MerkleTree, this.MerkleCalc, 0)
        this.MerkleCalc = {}
        return this.MerkleTree.Root;
    }
    Write(Data)
    {
        var RetBuf = {};
        var bRes = DBRow.prototype.Write.call(this, Data, RetBuf);
        if(bRes)
        {
            var Hash = shaarr(RetBuf.Buf);
            this.MerkleArr[Data.Num] = Hash
            this.MerkleCalc[Data.Num] = 1
        }
        return bRes;
    }
    Truncate(LastNum)
    {
        DBRow.prototype.Truncate.call(this, LastNum)
        if(this.MerkleArr.length !== LastNum + 1)
        {
            this.MerkleArr.length = LastNum + 1
            this.MerkleCalc[LastNum] = 1
        }
    }
};
class AccountApp extends require("./dapp")
{
    constructor()
    {
        super()
        var bReadOnly = (global.PROCESS_NAME !== "TX");
        this.CreateTrCount = 0
        this.FORMAT_ACCOUNT_ROW = "{\
            Currency:uint,\
            PubKey:arr33,\
            Name:str40,\
            Value:{SumCOIN:uint,SumCENT:uint32, OperationID:uint,Smart:uint32,Data:arr80},\
            BlockNumCreate:uint,\
            Adviser:uint,\
            Reserve:arr9,\
            }"
        this.ACCOUNT_ROW_SIZE = 6 + 33 + 40 + (6 + 4 + 6 + 84) + 6 + 6 + 9
        this.DBState = new MerkleDBRow("accounts-state", this.ACCOUNT_ROW_SIZE, this.FORMAT_ACCOUNT_ROW, bReadOnly)
        this.DBAct = new DBRow("accounts-act", 6 + 6 + (6 + 4 + 6 + 6 + 84) + 1 + 11, "{ID:uint, BlockNum:uint,PrevValue:{SumCOIN:uint,SumCENT:uint32, Reserve0:uint, OperationID:uint,Smart:uint32,Data:arr80}, Mode:byte, TrNum:uint16, Reserve: arr9}",
        bReadOnly)
        this.DBActPrev = new DBRow("accounts-act-prev", this.DBAct.DataSize, this.DBAct.Format, bReadOnly)
        if(global.READ_ONLY_DB)
            return ;
        this.DBAccountsHash = new DBRow("accounts-hash2", 6 + 32 + 32 + 10, "{BlockNum:uint, Hash:hash, SumHash:hash, Reserve: arr10}",
        bReadOnly)
        this.DBStateTX = new DBRow("accounts-tx", 6 + 94, "{BlockNum:uint, Reserve: arr94}", bReadOnly)
        if(global.START_SERVER)
            return ;
        if(!bReadOnly)
            this.Start()
        setInterval(this.ControlActSize.bind(this), 60 * 1000)
    }
    Start(bClean)
    {
        if(global.LOCAL_RUN)
            bClean = 1
        if(!bClean && this.DBState.GetMaxNum() + 1 >= BLOCK_PROCESSING_LENGTH2)
            return ;
        this.DBState.MerkleTree = undefined
        this.DBState.Truncate( - 1)
        this.DBAct.Truncate( - 1)
        this.DBActPrev.Truncate( - 1)
        this.DBAccountsHash.Truncate( - 1)
        this.DBStateTX.Truncate( - 1)
        this.DBState.Write({Num:0, PubKey:[], Value:{BlockNum:1, SumCOIN:0.95 * TOTAL_TER_MONEY}, Name:"System account"})
        for(var i = 1; i < 8; i++)
            this.DBState.Write({Num:i, PubKey:[], Value:{BlockNum:1}, Name:""})
        this.DBState.Write({Num:8, PubKey:GetArrFromHex(ARR_PUB_KEY[0]), Value:{BlockNum:1, SumCOIN:0.05 * TOTAL_TER_MONEY}, Name:"Founder account"})
        this.DBState.Write({Num:9, PubKey:GetArrFromHex(ARR_PUB_KEY[1]), Value:{BlockNum:1, SumCOIN:0}, Name:"Developer account"})
        for(var i = 10; i < BLOCK_PROCESSING_LENGTH2; i++)
            this.DBState.Write({Num:i, PubKey:GetArrFromHex(ARR_PUB_KEY[i - 8]), Value:{BlockNum:1}, Name:""})
        this.DBStateTX.Write({Num:0, BlockNum:0})
        this.CalcMerkleTree(1)
        ToLog("MAX_NUM:" + this.DBState.GetMaxNum())
    }
    Close()
    {
        this.DBState.Close()
        this.DBActPrev.Close()
        this.DBAct.Close()
        if(this.DBAccountsHash)
            this.DBAccountsHash.Close()
        if(this.DBStateTX)
            this.DBStateTX.Close()
    }
    ClearDataBase()
    {
        this.Start(1)
    }
    ControlActSize()
    {
        var MaxNum = this.DBAct.GetMaxNum();
        if(MaxNum >= TRANSACTION_PROOF_COUNT * 2)
        {
            ToLog("Rename act files")
            this.DBActPrev.CloseDBFile(this.DBActPrev.FileName)
            this.DBAct.CloseDBFile(this.DBAct.FileName)
            if(fs.existsSync(this.DBActPrev.FileNameFull))
            {
                var FileNameFull2 = this.DBActPrev.FileNameFull + "_del";
                try
                {
                    fs.renameSync(this.DBActPrev.FileNameFull, FileNameFull2)
                }
                catch(e)
                {
                    ToLog("Can-t rename for delete act-file: " + FileNameFull2)
                    return ;
                }
                fs.unlinkSync(FileNameFull2)
            }
            try
            {
                fs.renameSync(this.DBAct.FileNameFull, this.DBActPrev.FileNameFull)
            }
            catch(e)
            {
                ToLog("Can-t rename act-file!")
                return ;
            }
        }
    }
    OnDeleteBlock(Block)
    {
        if(Block.BlockNum < 1)
            return ;
        this.DeleteAct(Block.BlockNum)
    }
    OnWriteBlockStart(Block)
    {
        this.CreateTrCount = 0
        if(Block.BlockNum < 1)
            return ;
        this.OnDeleteBlock(Block)
        this.BeginBlock()
    }
    OnWriteBlockFinish(Block)
    {
        try
        {
            this.BeginTransaction()
            this.DoCoinBaseTR(Block)
            this.CommitTransaction(Block.BlockNum, 0xFFFF)
        }
        catch(e)
        {
            this.RollBackTransaction()
            ToError("DoCoinBaseTR: " + e)
        }
        this.CommitBlock(Block)
    }
    OnWriteTransaction(Block, Body, BlockNum, TrNum, ContextFrom)
    {
        var Result;
        try
        {
            Result = this.OnWriteTransactionTR(Block, Body, BlockNum, TrNum, ContextFrom)
        }
        catch(e)
        {
            Result = "" + e
        }
        if(Result !== true)
        {
            this.RollBackTransaction()
        }
        return Result;
    }
    OnWriteTransactionTR(Block, Body, BlockNum, TrNum, ContextFrom)
    {
        var Type = Body[0];
        var Result;
        switch(Type)
        {
            case TYPE_TRANSACTION_CREATE:
                {
                    Result = this.TRCreateAccount(Body, BlockNum, TrNum, ContextFrom)
                    break;
                }
            case TYPE_TRANSACTION_TRANSFER:
                {
                    Result = this.TRTransferMoney(Block, Body, BlockNum, TrNum, FORMAT_MONEY_TRANSFER, WorkStructTransfer)
                    break;
                }
            case TYPE_TRANSACTION_TRANSFER2:
                {
                    Result = this.TRTransferMoney(Block, Body, BlockNum, TrNum, FORMAT_MONEY_TRANSFER2, WorkStructTransfer2)
                    break;
                }
            case TYPE_TRANSACTION_TRANSFER3:
                {
                    Result = this.TRTransferMoney(Block, Body, BlockNum, TrNum, FORMAT_MONEY_TRANSFER3, WorkStructTransfer3)
                    break;
                }
            case TYPE_TRANSACTION_ACC_HASH:
                {
                    if(global.LOCAL_RUN || global.TEST_NETWORK);
                    else
                        if(BlockNum < START_BLOCK_ACCOUNT_HASH + 200000)
                            break;
                    var BlockNumHash = BlockNum - DELTA_BLOCK_ACCOUNT_HASH;
                    if(!this.TRCheckAccountHash(Body, BlockNum, TrNum))
                    {
                        Result = "BAD ACCOUNT HASH"
                        ToLog("2. ****FIND BAD ACCOUNT HASH IN BLOCK: " + BlockNumHash + " DO BLOCK=" + BlockNum)
                    }
                    else
                    {
                        Result = true
                        this.NexdDeltaAccountNum = DELTA_BLOCK_ACCOUNT_HASH
                        SERVER.LastNumAccountHashOK = BlockNumHash
                    }
                    break;
                }
        }
        return Result;
    }
    DoCoinBaseTR(Block)
    {
        if(Block.BlockNum < global.START_MINING)
            return ;
        if(!Block.PowHash)
            throw "#121 ERROR NO Block.PowHash";
        var SysData = this.ReadStateTR(0);
        var SysBalance = SysData.Value.SumCOIN;
        const REF_PERIOD_START = global.START_MINING;
        const REF_PERIOD_END = 30 * 1000 * 1000;
        var AccountID = ReadUintFromArr(Block.AddrHash, 0);
        if(AccountID < 8)
            return ;
        var Data = this.ReadStateTR(AccountID);
        if(Data && Data.Currency === 0 && Data.BlockNumCreate < Block.BlockNum)
        {
            var Power = GetPowPower(Block.PowHash);
            var Sum = Power * Power * SysBalance / TOTAL_TER_MONEY / 100;
            var CoinTotal = {SumCOIN:0, SumCENT:0};
            var CoinSum = COIN_FROM_FLOAT(Sum);
            if(!ISZERO(CoinSum))
            {
                if(Data.Adviser >= 8 && Block.BlockNum < REF_PERIOD_END)
                {
                    var RefData = this.ReadStateTR(Data.Adviser);
                    if(RefData && RefData.BlockNumCreate < Block.BlockNum - REF_PERIOD_MINING)
                    {
                        var K = (REF_PERIOD_END - Block.BlockNum) / (REF_PERIOD_END - REF_PERIOD_START);
                        var CoinAdv = COIN_FROM_FLOAT(Sum * K);
                        this.SendMoneyTR(Block, 0, Data.Adviser, CoinAdv, Block.BlockNum, 0xFFFF, "", "Adviser coin base [" + AccountID + "]", 1)
                        ADD(CoinTotal, CoinAdv)
                        ADD(CoinSum, CoinAdv)
                    }
                }
                this.SendMoneyTR(Block, 0, AccountID, CoinSum, Block.BlockNum, 0xFFFF, "", "Coin base", 1)
                ADD(CoinTotal, CoinSum)
                var CoinDevelop = CopyObjValue(CoinTotal);
                DIV(CoinDevelop, 100)
                if(!ISZERO(CoinDevelop))
                    this.SendMoneyTR(Block, 0, 9, CoinDevelop, Block.BlockNum, 0xFFFF, "", "Developers support", 1)
            }
        }
    }
    GetVerifyTransaction(BlockNum, TrNum, Body)
    {
        var Type = Body[0];
        var Find = 0;
        switch(Type)
        {
            case TYPE_TRANSACTION_CREATE:
            case TYPE_TRANSACTION_TRANSFER:
            case TYPE_TRANSACTION_TRANSFER2:
            case TYPE_TRANSACTION_TRANSFER3:
                {
                    Find = 1
                    break;
                }
            case TYPE_TRANSACTION_ACC_HASH:
                {
                    return 1;
                }
            default:
                return 0;
        }
        if(Find)
        {
            var DBAct;
            DBAct = this.DBAct
            var Num = this.FindBlockInAct(DBAct, BlockNum);
            if(Num === "NoHistory")
            {
                DBAct = this.DBActPrev
                Num = this.FindBlockInAct(DBAct, BlockNum)
            }
            if(Num === "NoHistory")
                return 0;
            else
                if(Num === "NoPresent")
                    return  - 1;
            while(true)
            {
                var Item = DBAct.Read(Num);
                if(Item)
                {
                    if(Item.BlockNum === BlockNum && Item.TrNum === TrNum)
                        break;
                    else
                        if(Item.BlockNum !== BlockNum)
                            return  - 1;
                }
                else
                {
                    return  - 1;
                }
                Num++
            }
        }
        return 1;
    }
    GetScriptTransaction(Body)
    {
        var Type = Body[0];
        var format;
        switch(Type)
        {
            case TYPE_TRANSACTION_CREATE:
                {
                    format = FORMAT_CREATE
                    break;
                }
            case TYPE_TRANSACTION_TRANSFER:
                {
                    format = FORMAT_MONEY_TRANSFER
                    break;
                }
            case TYPE_TRANSACTION_TRANSFER2:
                {
                    format = FORMAT_MONEY_TRANSFER2
                    break;
                }
            case TYPE_TRANSACTION_TRANSFER3:
                {
                    format = FORMAT_MONEY_TRANSFER3
                    break;
                }
            case TYPE_TRANSACTION_ACC_HASH:
                {
                    format = FORMAT_ACCOUNT_HASH
                    break;
                }
            default:
                return "";
        }
        try
        {
            var TR = BufLib.GetObjectFromBuffer(Body, format, {});
        }
        catch(e)
        {
            return "";
        }
        if(TR.Body && TR.Body.length)
        {
            var App = DAppByType[TR.Body[0]];
            if(App)
            {
                TR.Body = JSON.parse(App.GetScriptTransaction(TR.Body))
            }
        }
        ConvertBufferToStr(TR)
        return JSON.stringify(TR, "", 2);
    }
    TRCheckAccountHash(Body, BlockNum, TrNum)
    {
        if(BlockNum % PERIOD_ACCOUNT_HASH !== 0)
            return 1;
        try
        {
            var TR = BufLib.GetObjectFromBuffer(Body, FORMAT_ACCOUNT_HASH, {});
        }
        catch(e)
        {
            return 0;
        }
        if(BlockNum < START_BLOCK_ACCOUNT_HASH + 200000)
            return 1;
        var Item = this.GetAccountHashItem(TR.BlockNum);
        if(Item)
        {
            if(CompareArr(Item.Hash, TR.Hash) === 0)
                return 1;
            else
                return 0;
        }
        else
            return 2;
    }
    TRCreateAccount(Body, BlockNum, TrNum, ContextFrom)
    {
        if(Body.length < 90)
            return "Error length transaction";
        var CheckMinPower = 1;
        if(BlockNum >= 7000000 || global.LOCAL_RUN || global.TEST_NETWORK)
        {
            if(ContextFrom && ContextFrom.To.length === 1 && ContextFrom.To[0].ID === 0 && ContextFrom.To[0].SumCOIN >= PRICE_DAO(BlockNum).NewAccount)
            {
                CheckMinPower = 0
            }
            else
            {
                if(BlockNum % 10 !== 0)
                    return "The create transaction is not possible in this block: " + BlockNum;
                if(this.CreateTrCount > 0)
                    return "The account creation transaction was already in this block: " + BlockNum;
            }
        }
        this.CreateTrCount++
        var power;
        if(BlockNum >= global.BLOCKNUM_TICKET_ALGO)
        {
            var Tr = {body:Body};
            SERVER.CheckCreateTransactionObject(Tr)
            power = Tr.power
        }
        else
        {
            power = GetPowPower(shaarr(Body))
        }
        if(CheckMinPower)
        {
            var MinPower;
            if(BlockNum < 2500000)
                MinPower = MIN_POWER_POW_ACC_CREATE
            else
                if(BlockNum < 2800000)
                    MinPower = MIN_POWER_POW_ACC_CREATE + 2
                else
                    MinPower = MIN_POWER_POW_ACC_CREATE + 3
            if(power < MinPower)
                return "Error min power POW for create account (update client)";
        }
        try
        {
            var TR = BufLib.GetObjectFromBuffer(Body, FORMAT_CREATE, {});
        }
        catch(e)
        {
            return "Error transaction format";
        }
        if(BlockNum >= 3500000 && !TR.Name)
            return "Account name required";
        if(BlockNum >= 5700000 && !TR.Name.trim())
            return "Account name required";
        var Account = this.NewAccountTR(BlockNum, TrNum);
        Account.Currency = TR.Currency
        Account.PubKey = TR.PubKey
        Account.Name = TR.Name
        Account.Adviser = TR.Adviser
        Account.Value.Smart = TR.Smart
        this.WriteStateTR(Account, TrNum)
        if(CompareArr(Account.PubKey, WALLET.PubKeyArr) === 0)
        {
            WALLET.OnCreateAccount(Account)
        }
        return true;
    }
    TRTransferMoney(Block, Body, BlockNum, TrNum, format_money_transfer, workstructtransfer)
    {
        if(Body.length < 103)
            return "Error length transaction";
        try
        {
            var TR = BufLib.GetObjectFromBuffer(Body, format_money_transfer, workstructtransfer);
        }
        catch(e)
        {
            return "Error transaction format";
        }
        if(!TR.Version)
            TR.Version = 0
        var Data = this.ReadStateTR(TR.FromID);
        if(!Data)
            return "Error sender's account ID: " + TR.FromID;
        if(TR.Version < 3 && TR.Currency !== Data.Currency)
            return "Error sender's currency";
        if(TR.Version < 3)
        {
            if(TR.OperationID !== Data.Value.OperationID)
                return "Error OperationID (expected: " + Data.Value.OperationID + " for ID: " + TR.FromID + ")";
        }
        else
        {
            if(TR.OperationID < Data.Value.OperationID)
                return "Error OperationID (expected: " + Data.Value.OperationID + " for ID: " + TR.FromID + ")";
            var MaxCountOperationID = 100;
            if(BlockNum >= global.BLOCKNUM_TICKET_ALGO)
                MaxCountOperationID = 1000000
            if(TR.OperationID > Data.Value.OperationID + MaxCountOperationID)
                return "Error too much OperationID (expected max: " + (Data.Value.OperationID + MaxCountOperationID) + " for ID: " + TR.FromID + ")";
        }
        if(BlockNum >= SMART_BLOCKNUM_START)
        {
            if(TR.To.length > 10)
                return "The number of recipients has been exceeded (max=5, current count=" + TR.To.length + ")";
        }
        if(TR.Body && TR.Body.length && TR.To.length > 1)
        {
            return "Error - dapps transaction can not be used in a multiple transaction";
        }
        var TotalSum = {SumCOIN:0, SumCENT:0};
        var MapItem = {};
        var bWas = 0;
        for(var i = 0; i < TR.To.length; i++)
        {
            var Item = TR.To[i];
            if(Item.SumCOIN > MAX_SUM_TER)
                return "Error MAX_SUM_COIN";
            if(Item.SumCENT >= MAX_SUM_CENT)
                return "Error MAX_SUM_CENT";
            if(TR.Version < 3)
            {
                if(Item.ID === TR.FromID || MapItem[Item.ID])
                    continue;
                MapItem[Item.ID] = 1
            }
            bWas = 1
            ADD(TotalSum, Item)
        }
        if(!bWas && TR.Version < 3)
            return "No significant recipients";
        var ZeroSum = 0;
        if(TotalSum.SumCOIN === 0 && TotalSum.SumCENT === 0)
        {
            if(TR.Version < 3)
                return "No money transaction";
            else
                ZeroSum = 1
        }
        if(Data.Value.SumCOIN < TotalSum.SumCOIN || (Data.Value.SumCOIN === TotalSum.SumCOIN && Data.Value.SumCENT < TotalSum.SumCENT))
            return "Not enough money on the account";
        Data.Value.OperationID++
        TR.Value = TotalSum
        var arr = [];
        MapItem = {}
        var arrpub = [];
        for(var i = 0; i < TR.To.length; i++)
        {
            var Item = TR.To[i];
            var DataTo = this.ReadStateTR(Item.ID);
            if(!DataTo)
                return "Error receiver account ID: " + Item.ID;
            if(!ZeroSum && Data.Currency !== DataTo.Currency)
                return "Error receiver currency";
            for(var j = 0; j < 33; j++)
                arrpub[arrpub.length] = DataTo.PubKey[j]
            if(DataTo.Value.Smart)
            {
                if(TR.To.length > 1)
                    return "Error - smart accounts can not be used in a multiple transaction";
            }
            if(TR.Version === 3 && Item.ID === 0 && Item.PubKey && Item.PubKey.length === 33)
            {
                if(Item.SumCOIN < PRICE_DAO(BlockNum).NewAccount)
                    return "Not enough money for create account with index: " + i;
                var name = TR.Description;
                var index = name.indexOf("\n");
                if(index !==  - 1)
                    name = name.substr(0, index)
                var Account = this.NewAccountTR(BlockNum, TrNum);
                Account.PubKey = Item.PubKey
                Account.Name = name
                this.WriteStateTR(Account, TrNum)
                Item.ID = Account.Num
                this.SendMoneyTR(Block, Data.Num, Account.Num, {SumCOIN:Item.SumCOIN, SumCENT:Item.SumCENT}, BlockNum, TrNum, TR.Description,
                TR.Description, 1)
                this.SendMoneyTR(Block, Account.Num, 0, {SumCOIN:PRICE_DAO(BlockNum).NewAccount, SumCENT:0}, BlockNum, TrNum, "Fee for create account",
                "", 1)
            }
            else
            {
                if(TR.Version < 3)
                {
                    if(Item.ID === TR.FromID || MapItem[Item.ID])
                        continue;
                    MapItem[Item.ID] = 1
                }
                this.SendMoneyTR(Block, Data.Num, DataTo.Num, {SumCOIN:Item.SumCOIN, SumCENT:Item.SumCENT}, BlockNum, TrNum, TR.Description,
                TR.Description, 0)
                arr.push(DataTo)
            }
        }
        if(TR.Version < 3 && arr.length === 0)
            return "No recipients";
        var hash;
        if(TR.Version === 2 || TR.Version === 3)
        {
            for(var j = 0; j < Body.length - 64 - 12; j++)
                arrpub[arrpub.length] = Body[j]
            hash = shabuf(arrpub)
        }
        else
            if(!TR.Version)
            {
                hash = shabuf(Body.slice(0, Body.length - 64 - 12))
            }
            else
            {
                return "Error transaction version";
            }
        var Result = 0;
        if(Data.PubKey[0] === 2 || Data.PubKey[0] === 3)
            try
            {
                Result = secp256k1.verify(hash, TR.Sign, Data.PubKey)
            }
            catch(e)
            {
            }
        if(!Result)
        {
            return "Error sign transaction";
        }
        if(TR.Body && TR.Body.length)
        {
            var App = DAppByType[TR.Body[0]];
            if(App)
            {
                TR.FromPubKey = Data.PubKey
                var Result = App.OnWriteTransaction(Block, TR.Body, BlockNum, TrNum, TR);
                if(Result !== true)
                    return Result;
            }
        }
        return true;
    }
    ReadState(Num)
    {
        var Data = this.DBState.Read(Num);
        if(Data)
            Data.WN = ""
        return Data;
    }
    GetMinBlockAct()
    {
        var DBAct;
        var MaxNum = this.DBActPrev.GetMaxNum();
        if(MaxNum ===  - 1)
            DBAct = this.DBAct
        else
            DBAct = this.DBActPrev
        var Item = DBAct.Read(0);
        if(!Item)
            return  - 1;
        else
            return Item.BlockNum;
    }
    DeleteAct(BlockNumFrom)
    {
        if(global.START_SERVER)
            throw "DeleteAct START_SERVER";
        if(BlockNumFrom > 0)
            this.DBStateTX.Write({Num:0, BlockNum:BlockNumFrom - 1})
        this.DeleteActOneDB(this.DBAct, BlockNumFrom)
        this.DeleteActOneDB(this.DBActPrev, BlockNumFrom)
        this.DBAccountsHash.Truncate(Math.trunc(BlockNumFrom / PERIOD_ACCOUNT_HASH))
        WALLET.OnDeleteBlock(BlockNumFrom)
    }
    DeleteActOneDB(DBAct, BlockNum)
    {
        var MaxNum = DBAct.GetMaxNum();
        if(MaxNum ===  - 1)
            return ;
        for(var num = MaxNum; num >= 0; num--)
        {
            var ItemCheck = DBAct.Read(num);
            if(!ItemCheck)
            {
                ToLogTrace("!ItemCheck")
                throw "ERRR DeleteActOneDB";
            }
            if(ItemCheck.BlockNum < BlockNum)
            {
                this.ProcessingDeleteAct(DBAct, num + 1)
                return ;
            }
        }
        this.ProcessingDeleteAct(DBAct, 0)
    }
    ProcessingDeleteAct(DBAct, StartNum)
    {
        var Map = {};
        var bWas = 0;
        var NumTruncateState;
        for(var num = StartNum; true; num++)
        {
            var Item = DBAct.Read(num);
            if(!Item)
                break;
            bWas = 1
            if(Map[Item.ID])
                continue;
            Map[Item.ID] = 1
            if(Item.Mode === 1)
            {
                if(!NumTruncateState)
                    NumTruncateState = Item.ID
            }
            else
            {
                var Data = this.DBState.Read(Item.ID);
                Data.Value = Item.PrevValue
                this.DBState.Write(Data)
            }
        }
        if(bWas)
        {
            if(NumTruncateState)
            {
                this.DBState.Truncate(NumTruncateState - 1)
            }
            DBAct.Truncate(StartNum - 1)
        }
    }
    FindBlockInAct(DBAct, BlockNum)
    {
        return DBAct.FastFindBlockNum(BlockNum);
    }
    GetHole()
    {
        return [{s:8300, f:186478}];
    }
    IsHole(num)
    {
        if(global.ALL_VIEW_ROWS)
            return 0;
        var ArrHole = this.GetHole();
        for(var i = 0; i < ArrHole.length; i++)
            if(num >= ArrHole[i].s && num <= ArrHole[i].f)
                return 1;
        return 0;
    }
    FindAccounts(PubKeyArr, map, nSet)
    {
        var Count = 0;
        for(var num = 0; true; num++)
        {
            if(this.IsHole(num))
                continue;
            var Data = this.ReadState(num);
            if(!Data)
                break;
            for(var i = 0; i < PubKeyArr.length; i++)
                if(CompareArr(Data.PubKey, PubKeyArr[i]) === 0)
                {
                    map[Data.Num] = i
                    Count++
                }
        }
        return Count;
    }
    GetWalletAccountsByMap(map)
    {
        var arr = [];
        for(var key in map)
        {
            var Num = parseInt(key);
            var Data = this.ReadState(Num);
            if(Data)
            {
                if(!Data.PubKeyStr)
                    Data.PubKeyStr = GetHexFromArr(Data.PubKey)
                arr.push(Data)
                Data.WN = map[key]
                Data.Name = NormalizeName(Data.Name)
                if(Data.Currency)
                    Data.CurrencyObj = DApps.Smart.ReadSimple(Data.Currency)
                if(Data.Value.Smart)
                {
                    Data.SmartObj = DApps.Smart.ReadSimple(Data.Value.Smart)
                    try
                    {
                        Data.SmartState = BufLib.GetObjectFromBuffer(Data.Value.Data, Data.SmartObj.StateFormat, {})
                        if(typeof Data.SmartState === "object")
                            Data.SmartState.Num = Num
                    }
                    catch(e)
                    {
                        Data.SmartState = {}
                    }
                }
            }
        }
        return arr;
    }
    GetMaxAccount()
    {
        return this.DBState.GetMaxNum();
    }
    GetRowsAccounts(start, count, Filter, bGetState)
    {
        if(Filter)
        {
            Filter = Filter.trim()
        }
        var F;
        if(Filter)
        {
            if(Filter.substring(0, 1) === "=")
            {
                Filter = Filter.substring(1)
                try
                {
                    F = CreateEval(Filter, "Cur,Currency,ID,Operation,Amount,Adviser,Name,PubKey,Smart,BlockNum")
                }
                catch(e)
                {
                    F = undefined
                    ToLog("" + e)
                }
            }
            else
            {
                Filter = Filter.toUpperCase()
            }
        }
        var WasError = 0;
        var arr = [];
        for(var num = start; true; num++)
        {
            if(this.IsHole(num))
                continue;
            var Data = this.ReadState(num);
            if(!Data)
                break;
            if(!Data.PubKeyStr)
                Data.PubKeyStr = GetHexFromArr(Data.PubKey)
            Data.Name = NormalizeName(Data.Name)
            if(F)
            {
                var Cur = Data.Currency;
                var Currency = Data.Currency;
                var ID = Data.Num;
                var Operation = Data.Value.OperationID;
                var Amount = FLOAT_FROM_COIN(Data.Value);
                var Adviser = Data.Adviser;
                var Name = Data.Name;
                var PubKey = GetHexFromArr(Data.PubKey);
                var Smart = Data.Value.Smart;
                try
                {
                    if(!F(Cur, Currency, ID, Operation, Amount, Adviser, Name, PubKey, Smart, Data.BlockNumCreate))
                        continue;
                }
                catch(e)
                {
                    if(!WasError)
                        ToLog("" + e)
                    WasError = 1
                }
            }
            else
                if(Filter)
                {
                    var Amount = FLOAT_FROM_COIN(Data.Value);
                    var PubKey = GetHexFromArr(Data.PubKey);
                    var Str = "" + Data.Num + " " + Data.Value.OperationID + " " + Data.Name.toUpperCase() + " " + Data.Adviser + " " + Amount + " " + PubKey + " " + Smart + " " + Data.BlockNumCreate;
                    if(Str.indexOf(Filter) < 0)
                        continue;
                }
            if(bGetState)
            {
                if(Data.Currency)
                    Data.CurrencyObj = DApps.Smart.ReadSimple(Data.Currency)
                if(Data.Value.Smart)
                {
                    Data.SmartObj = DApps.Smart.ReadSimple(Data.Value.Smart)
                    try
                    {
                        Data.SmartState = BufLib.GetObjectFromBuffer(Data.Value.Data, Data.SmartObj.StateFormat, {})
                        if(typeof Data.SmartState === "object")
                            Data.SmartState.Num = num
                    }
                    catch(e)
                    {
                        Data.SmartState = {}
                    }
                }
            }
            arr.push(Data)
            count--
            if(count < 1)
                break;
        }
        return arr;
    }
    GetActsMaxNum()
    {
        return this.DBActPrev.GetMaxNum() + this.DBAct.GetMaxNum();
    }
    GetActList(start, count)
    {
        var arr = [];
        var num;
        for(num = start; num < start + count; num++)
        {
            var Item = this.DBActPrev.Read(num);
            if(!Item)
                break;
            Item.Num = "Prev." + Item.Num
            if(Item.TrNum === 0xFFFF)
                Item.TrNum = ""
            arr.push(Item)
            if(arr.length > count)
                return arr;
        }
        start = num - this.DBActPrev.GetMaxNum() - 1
        for(num = start; num < start + count; num++)
        {
            var Item = this.DBAct.Read(num);
            if(!Item)
                break;
            Item.Num = Item.Num
            if(Item.TrNum === 0xFFFF)
                Item.TrNum = ""
            arr.push(Item)
            if(arr.length > count)
                return arr;
        }
        return arr;
    }
    GetHashOrUndefined(BlockNum)
    {
        if(BlockNum % PERIOD_ACCOUNT_HASH !== 0)
            return undefined;
        var Item = this.GetAccountHashItem(BlockNum);
        if(Item)
            return Item.Hash;
        else
            return undefined;
    }
    GetAccountHashItem(BlockNum)
    {
        var Item = this.DBAccountsHash.Read(Math.trunc(BlockNum / PERIOD_ACCOUNT_HASH));
        return Item;
    }
    GetHashedMaxBlockNum()
    {
        var Num = this.DBAccountsHash.GetMaxNum();
        if(Num >= 0)
        {
            var Data = this.DBAccountsHash.Read(Num);
            return Data.BlockNum;
        }
        else
            return 0;
    }
    CalcHash(Block)
    {
        if(Block.BlockNum % PERIOD_ACCOUNT_HASH !== 0)
            return ;
        if(this.DBState.WasUpdate)
        {
            this.CalcMerkleTree()
        }
        var Hash = this.DBState.MerkleHash;
        var Data = {Num:Block.BlockNum / PERIOD_ACCOUNT_HASH, BlockNum:Block.BlockNum, Hash:Hash, SumHash:Block.SumHash};
        this.DBAccountsHash.Write(Data)
        this.DBAccountsHash.Truncate(Block.BlockNum / PERIOD_ACCOUNT_HASH)
    }
    CalcMerkleTree(bForce)
    {
        this.DBState.MerkleHash = this.DBState.CalcMerkleTree(bForce)
        this.DBState.WasUpdate = 0
    }
    GetAdviserByMiner(Map, Id)
    {
        var Adviser = Map[Id];
        if(Adviser === undefined)
        {
            var Item = this.ReadState(Id);
            if(Item)
                Adviser = Item.Adviser
            else
                Adviser = 0
            Map[Id] = Adviser
        }
        return Adviser;
    }
    BeginBlock()
    {
        this.DBChanges = {BlockMap:{}, BlockMaxAccount:this.GetMaxAccount(), BlockHistory:[], BlockEvent:[], }
    }
    BeginTransaction()
    {
        global.TickCounter = 35000
        this.DBChanges.TRMap = {}
        this.DBChanges.TRMaxAccount = this.DBChanges.BlockMaxAccount
        this.DBChanges.RollBackTransaction = 0
        this.DBChanges.TRHistory = []
        this.DBChanges.TREvent = []
    }
    RollBackTransaction()
    {
        this.DBChanges.RollBackTransaction = 1
    }
    CommitBlock(Block)
    {
        var BlockNum = Block.BlockNum;
        var DBChanges = this.DBChanges;
        var arr = [];
        for(var key in DBChanges.BlockMap)
        {
            key = ParseNum(key)
            var Data = DBChanges.BlockMap[key];
            if(Data.Changed)
            {
                arr.push(Data)
            }
        }
        arr.sort(function (a,b)
        {
            return a.Num - b.Num;
        })
        for(var i = 0; i < arr.length; i++)
        {
            var Account = arr[i];
            var BackLog = {Num:undefined, ID:Account.Num, BlockNum:BlockNum, PrevValue:Account.BackupValue, TrNum:Account.ChangeTrNum,
                Mode:Account.New};
            this.DBAct.Write(BackLog)
            this.DBState.Write(Account)
        }
        for(var i = 0; i < DBChanges.BlockHistory.length; i++)
            WALLET.OnDoHistoryAct(DBChanges.BlockHistory[i], BlockNum)
        for(var i = 0; i < DBChanges.BlockEvent.length; i++)
        {
            var Data = DBChanges.BlockEvent[i];
            var Has = global.TreeFindTX.LoadValue("Smart:" + Data.Smart, 1);
            if(Has)
            {
                process.send({cmd:"DappEvent", Data:Data})
            }
        }
        global.TickCounter = 0
        this.DBChanges = undefined
        if(BlockNum > 100)
        {
            var StateTX = this.DBStateTX.Read(0);
            if(StateTX.BlockNum !== BlockNum - 1)
                throw "ERROR SEQ STATETX";
        }
        this.CalcHash(Block)
        this.DBStateTX.Write({Num:0, BlockNum:BlockNum})
    }
    CommitTransaction(BlockNum, TrNum)
    {
        var DBChanges = this.DBChanges;
        if(DBChanges.RollBackTransaction)
            return ;
        DBChanges.BlockMaxAccount = DBChanges.TRMaxAccount
        for(var key in DBChanges.TRMap)
        {
            key = ParseNum(key)
            var Data = DBChanges.TRMap[key];
            if(Data.Changed)
            {
                DBChanges.BlockMap[key] = Data
                if(Data.New)
                    this.OnWriteNewAccountTR(Data, BlockNum, TrNum)
            }
        }
        for(var i = 0; i < DBChanges.TRHistory.length; i++)
            DBChanges.BlockHistory.push(DBChanges.TRHistory[i])
        for(var i = 0; i < DBChanges.TREvent.length; i++)
        {
            DBChanges.BlockEvent.push(DBChanges.TREvent[i])
        }
        global.TickCounter = 0
    }
    OnWriteNewAccountTR(Data, BlockNum, TrNum)
    {
        if(BlockNum < SMART_BLOCKNUM_START)
            Data.Value.Smart = 0
        Data.BlockNumCreate = BlockNum
        if(Data.Adviser > this.GetMaxAccount())
            Data.Adviser = 0
        if(Data.Value.Smart > DApps.Smart.GetMaxNum())
            Data.Value.Smart = 0
        if(Data.Currency > DApps.Smart.GetMaxNum())
            Data.Currency = 0
        if(Data.Currency)
        {
            var Smart = DApps.Smart.ReadSmart(Data.Currency);
            if(!Smart || !Smart.TokenGenerate)
                Data.Currency = 0
        }
    }
    NewAccountTR(BlockNum, TrNum)
    {
        var DBChanges = this.DBChanges;
        DBChanges.TRMaxAccount++
        var Data = {Num:DBChanges.TRMaxAccount, New:1, Changed:1, ChangeTrNum:TrNum, BackupValue:{}, PubKey:[], Currency:0, Adviser:0,
            Value:{SumCOIN:0, SumCENT:0, OperationID:0, Smart:0, Data:[]}};
        this.DBChanges.TRMap[Data.Num] = Data
        return Data;
    }
    ReadStateTR(Num)
    {
        Num = ParseNum(Num)
        var TRMap = this.DBChanges.TRMap;
        var Data = TRMap[Num];
        if(!Data)
        {
            var Value;
            var BlockMap = this.DBChanges.BlockMap;
            var BData = BlockMap[Num];
            if(!BData)
            {
                BData = this.DBState.Read(Num)
                if(!BData)
                    return undefined;
                BData.Num = Num
                Value = BData.Value
                BData.BackupValue = {SumCOIN:Value.SumCOIN, SumCENT:Value.SumCENT, OperationID:Value.OperationID, Smart:Value.Smart, Data:Value.Data}
                BlockMap[Num] = BData
            }
            Value = BData.Value
            Data = {Num:Num, Currency:BData.Currency, PubKey:BData.PubKey, Name:BData.Name, BlockNumCreate:BData.BlockNumCreate, Adviser:BData.Adviser,
                Value:{SumCOIN:Value.SumCOIN, SumCENT:Value.SumCENT, OperationID:Value.OperationID, Smart:Value.Smart, Data:CopyArr(Value.Data)},
                BackupValue:BData.BackupValue}
            TRMap[Num] = Data
        }
        return Data;
    }
    WriteStateTR(Data, TrNum)
    {
        Data.Changed = 1
        Data.ChangeTrNum = TrNum
    }
    SendMoneyTR(Block, FromID, ToID, CoinSum, BlockNum, TrNum, DescriptionFrom, DescriptionTo, OperationCount)
    {
        FromID = ParseNum(FromID)
        ToID = ParseNum(ToID)
        if(CoinSum.SumCENT >= 1e9)
        {
            throw "ERROR SumCENT>=1e9";
        }
        var FromData = this.ReadStateTR(FromID);
        if(!FromData)
        {
            throw "Send: Error account FromNum: " + FromID;
        }
        if(!SUB(FromData.Value, CoinSum))
        {
            throw "Not enough money on the account ID:" + FromID;
        }
        this.WriteStateTR(FromData, TrNum)
        if(WALLET.AccountMap[FromID] !== undefined)
        {
            this.DBChanges.TRHistory.push({Direct:"-", FromID:FromID, ToID:ToID, SumCOIN:CoinSum.SumCOIN, SumCENT:CoinSum.SumCENT, Description:DescriptionFrom,
                FromOperationID:FromData.Value.OperationID, Currency:FromData.Currency})
        }
        var ToData = this.ReadStateTR(ToID);
        if(!ToData)
        {
            throw "Send: Error account ToNum: " + ToID;
        }
        ADD(ToData.Value, CoinSum)
        this.WriteStateTR(ToData, TrNum)
        if(WALLET.AccountMap[ToID] !== undefined)
        {
            this.DBChanges.TRHistory.push({Direct:"+", FromID:FromID, ToID:ToID, SumCOIN:CoinSum.SumCOIN, SumCENT:CoinSum.SumCENT, Description:DescriptionTo,
                FromOperationID:FromData.Value.OperationID, Currency:ToData.Currency})
        }
        FromData.Value.OperationID += OperationCount
        if(FromData.Value.Smart)
        {
            var Context = {FromID:FromID, ToID:ToID, Description:DescriptionFrom, Value:CoinSum};
            RunSmartMethod(Block, FromData.Value.Smart, FromData, BlockNum, TrNum, Context, "OnSend")
        }
        if(ToData.Value.Smart)
        {
            var Context = {FromID:FromID, ToID:ToID, Description:DescriptionTo, Value:CoinSum};
            RunSmartMethod(Block, ToData.Value.Smart, ToData, BlockNum, TrNum, Context, "OnGet")
        }
    }
};
module.exports = AccountApp;
var App = new AccountApp;
DApps["Accounts"] = App;
DAppByType[TYPE_TRANSACTION_CREATE] = App;
DAppByType[TYPE_TRANSACTION_TRANSFER] = App;
DAppByType[TYPE_TRANSACTION_TRANSFER2] = App;
DAppByType[TYPE_TRANSACTION_TRANSFER3] = App;
DAppByType[TYPE_TRANSACTION_ACC_HASH] = App;
