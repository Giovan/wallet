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

global.PROCESS_NAME = "WEB";
const crypto = require('crypto');
const http = require('http'), net = require('net'), url = require('url'), fs = require('fs'), querystring = require('querystring');
global.MAX_STAT_PERIOD = 60;
require("../core/constant");
global.MAX_STAT_PERIOD = 60;
global.DATA_PATH = GetNormalPathString(global.DATA_PATH);
global.CODE_PATH = GetNormalPathString(global.CODE_PATH);
require("../core/library");
require("../core/geo");
global.READ_ONLY_DB = 1;
global.MAX_STAT_PERIOD = 60;
var HostNodeList = [];
var AllNodeList = [];
var NodeBlockChain = [];
var LastAlive = Date.now();
setTimeout(function ()
{
    setInterval(CheckAlive, 1000);
}, 20000);
setInterval(function ()
{
    process.send({cmd:"Alive"});
}, 1000);
process.send({cmd:"online", message:"OK"});
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
        case "retcall":
            var F = GlobalRunMap[msg.id];
            if(F)
            {
                delete GlobalRunMap[msg.id];
                F(msg.Err, msg.Params);
            }
            break;
        case "Stat":
            ADD_TO_STAT(msg.Name, msg.Value);
            break;
        case "NodeList":
            HostNodeList = msg.Value;
            AllNodeList = msg.ValueAll;
            break;
        case "NodeBlockChain":
            NodeBlockChain = msg.Value;
            break;
        case "DappEvent":
            {
                AddDappEventToGlobalMap(msg.Data);
                break;
            }
        case "ToLogClient":
            {
                ToLogClient0(msg.Str, msg.StrKey, msg.bFinal);
                break;
            }
    }
});

function CheckAlive()
{
    if(global.NOALIVE)
        return ;
    var Delta = Date.now() - LastAlive;
    if(Delta > CHECK_STOP_CHILD_PROCESS)
    {
        ToLog("HOSTING: ALIVE TIMEOUT Stop and exit: " + Delta + "/" + global.CHECK_STOP_CHILD_PROCESS);
        process.exit(0);
        return ;
    }
};
process.on('uncaughtException', function (err)
{
    ToError(err.stack);
    ToLog(err.stack);
    TO_ERROR_LOG("HOSTING", 777, err);
    ToLog("-----------------HOSTING EXIT------------------");
    process.exit();
});
process.on('error', function (err)
{
    ToError("HOSTING:\n" + err.stack);
    ToLog(err.stack);
});
if(!global.HTTP_HOSTING_PORT)
{
    ToLogTrace("global.HTTP_HOSTING_PORT=" + global.HTTP_HOSTING_PORT);
    process.exit();
}
var CServerDB = require("../core/db/block-db");
var KeyPair = crypto.createECDH('secp256k1');
KeyPair.setPrivateKey(Buffer.from([77, 77, 77, 77, 77, 77, 77, 77, 77, 77, 77, 77, 77, 77, 77, 77, 77, 77, 77, 77, 77, 77,
77, 77, 77, 77, 77, 77, 77, 77, 77, 77]));
global.SERVER = new CServerDB(KeyPair, undefined, undefined, false, true);
global.HTTP_PORT_NUMBER = 0;
require("../core/html-server");
require("../core/transaction-validator");
global.STAT_MODE = 1;
setInterval(PrepareStatEverySecond, 1000);
var HostingServer;
if(global.HTTPS_HOSTING_DOMAIN)
{
    var file_sert = GetDataPath("sertif.lst");
    CheckCreateDir(GetDataPath("tmp"));
    var greenlock = require('greenlock').create({version:'draft-12', server:'https://acme-v02.api.letsencrypt.org/directory', configDir:GetDataPath('tmp'),
    });
    var redir = require('redirect-https')();
    require('http').createServer(greenlock.middleware(redir)).listen(80);
    var GetNewSert = 1;
    if(fs.existsSync(file_sert))
    {
        var certs = LoadParams(file_sert, {});
        var Delta = certs.expiresAt - Date.now();
        if(Delta > 7 * 86000 * 1000)
        {
            ToLog("USE OLD SERT. ExpiresAt: " + new Date(certs.expiresAt));
            GetNewSert = 0;
            var tlsOptions = {key:certs.privkey, cert:certs.cert + '\r\n' + certs.chain};
            HostingServer = require('https').createServer(tlsOptions, MainHTTPFunction);
            RunListenServer();
        }
    }
    if(GetNewSert)
    {
        ToLog("Start get new SERT");
        var opts = {domains:[global.HTTPS_HOSTING_DOMAIN], email:'progr76@gmail.com', agreeTos:true, communityMember:true, };
        greenlock.register(opts).then(function (certs)
        {
            SaveParams(file_sert, certs);
            var tlsOptions = {key:certs.privkey, cert:certs.cert + '\r\n' + certs.chain};
            HostingServer = require('https').createServer(tlsOptions, MainHTTPFunction);
            RunListenServer();
        }, function (err)
        {
            ToError(err);
        });
    }
}
else
{
    HostingServer = http.createServer(MainHTTPFunction);
    RunListenServer();
}

function MainHTTPFunction(request,response)
{
    if(!request.socket || !request.socket.remoteAddress)
        return ;
    SetSafeResponce(response);
    var DataURL = url.parse(request.url);
    var Params = querystring.parse(DataURL.query);
    var Path = querystring.unescape(DataURL.pathname);
    var Type = request.method;
    if(Type === "POST")
    {
        let Response = response;
        let postData = "";
        request.addListener("data", function (postDataChunk)
        {
            if(postData.length <= 8192 && postDataChunk.length <= 8192)
                postData += postDataChunk;
            else
            {
                var Str = "Error postDataChunk.length=" + postDataChunk.length;
                ToLog(Str);
                Response.writeHead(405, {'Content-Type':'text/html'});
                Response.end(Str);
            }
        });
        request.addListener("end", function ()
        {
            var Data;
            if(postData && postData.length)
            {
                try
                {
                    Data = JSON.parse(postData);
                }
                catch(e)
                {
                    Response.writeHead(405, {'Content-Type':'text/html'});
                    Response.end("Error data parsing");
                }
            }
            DoCommandNew(response, Type, Path, Data);
        });
    }
    else
    {
        DoCommandNew(response, Type, Path, Params);
    }
};
var bWasRun = 0;

function RunListenServer()
{
    HostingServer.on('error', function (err)
    {
        if(err.code === 'EADDRINUSE')
        {
            ToLogClient('Port ' + global.HTTP_HOSTING_PORT + ' in use, retrying...');
            if(HostingServer.Server)
                HostingServer.Server.close();
            setTimeout(function ()
            {
                RunListenServer();
            }, 5000);
            return ;
        }
        ToError("H##6");
        ToError(err);
    });
    ToLogClient("Prepare to run WEB-server on port: " + global.HTTP_HOSTING_PORT);
    HostingServer.listen(global.HTTP_HOSTING_PORT, '0.0.0.0', function ()
    {
        if(!bWasRun)
            ToLogClient("Run WEB-server on port: " + global.HTTP_HOSTING_PORT);
        bWasRun = 1;
    });
};
var WalletFileMap = {};
WalletFileMap["coinlib.js"] = 1;
WalletFileMap["client.js"] = 1;
WalletFileMap["diagram.js"] = 1;
WalletFileMap["sha3.js"] = 1;
WalletFileMap["terahashlib.js"] = 1;
WalletFileMap["wallet-web.js"] = 1;
WalletFileMap["wallet-lib.js"] = 1;
WalletFileMap["crypto-client.js"] = 1;
WalletFileMap["dapp-inner.js"] = 1;
WalletFileMap["marked.js"] = 1;
WalletFileMap["highlight.js"] = 1;
WalletFileMap["highlight-js.js"] = 1;
WalletFileMap["highlight-html.js"] = 1;
WalletFileMap["codes.css"] = 1;
WalletFileMap["sign-lib-min.js"] = 1;
WalletFileMap["buttons.css"] = 1;
WalletFileMap["style.css"] = 1;
WalletFileMap["wallet.css"] = 1;
WalletFileMap["blockviewer.html"] = 1;
WalletFileMap["web-wallet.html"] = 1;
global.HostingCaller = {};

function DoCommandNew(response,Type,Path,Params)
{
    if(Path.substring(0, 1) === "/")
        Path = Path.substring(1);
    var ArrPath = Path.split('/', 3);
    var Method = ArrPath[0];
    var F = HostingCaller[Method];
    if(F)
    {
        response.writeHead(200, {'Content-Type':'text/plain', 'Access-Control-Allow-Origin':"*"});
        var Ret = F(Params, response);
        if(Ret === null)
            return ;
        try
        {
            var Str;
            if(typeof Ret === "object")
                Str = JSON.stringify(Ret);
            else
                Str = Ret;
            response.end(Str);
        }
        catch(e)
        {
            ToLog("ERR PATH:" + Path);
            ToLog(e);
            response.end();
        }
        return ;
    }
    Method = Method.toLowerCase();
    if(Method === "dapp" && ArrPath.length === 2)
        Method = "DappTemplateFile";
    switch(Method)
    {
        case "":
            SendWebFile(response, "./SITE/index.html", undefined, true);
            break;
        case "file":
            SendBlockFile(response, ArrPath[1], ArrPath[2]);
            break;
        case "DappTemplateFile":
            DappTemplateFile(response, ArrPath[1]);
            break;
        case "smart":
            DappSmartCodeFile(response, ArrPath[1]);
            break;
        default:
            {
                var Name = ArrPath[ArrPath.length - 1];
                if(typeof Name !== "string")
                    Name = "ErrorPath";
                else
                    if(Name.indexOf("..") >= 0 || Name.indexOf("\\") >= 0 || Name.indexOf("/") >= 0)
                        Name = "ErrorFilePath";
                if(Name.indexOf(".") < 0)
                    Name += ".html";
                var PrefixPath;
                if(Method === "files")
                {
                    PrefixPath = "../FILES";
                    Name = PrefixPath + "/" + Name;
                    SendWebFile(response, Name, Path);
                    return ;
                }
                else
                    if(WalletFileMap[Name])
                        PrefixPath = "./HTML";
                    else
                        PrefixPath = "./SITE";
                var type = Path.substr(Path.length - 3, 3);
                switch(type)
                {
                    case ".js":
                        Name = PrefixPath + "/JS/" + Name;
                        break;
                    case "css":
                        Name = PrefixPath + "/CSS/" + Name;
                        break;
                    case "wav":
                    case "mp3":
                        Name = PrefixPath + "/SOUND/" + Name;
                        break;
                    case "svg":
                    case "png":
                    case "gif":
                    case "jpg":
                    case "ico":
                        Name = PrefixPath + "/PIC/" + Name;
                        break;
                    case "pdf":
                    case "zip":
                    case "exe":
                    case "msi":
                        Name = PrefixPath + "/FILES/" + Name;
                        break;
                    default:
                        Name = PrefixPath + "/" + Name;
                        break;
                }
                SendWebFile(response, Name, Path);
                break;
            }
    }
};
HostingCaller.GetCurrentInfo = function (Params)
{
    var Ret = {result:1, VersionNum:global.UPDATE_CODE_VERSION_NUM, MaxNumBlockDB:SERVER.GetMaxNumBlockDB(), CurBlockNum:GetCurrentBlockNumByTime(),
        MaxAccID:DApps.Accounts.GetMaxAccount(), MaxDappsID:DApps.Smart.GetMaxNum(), NETWORK:global.NETWORK, CurTime:Date.now(), DELTA_CURRENT_TIME:DELTA_CURRENT_TIME,
        MIN_POWER_POW_TR:MIN_POWER_POW_TR, FIRST_TIME_BLOCK:FIRST_TIME_BLOCK, CONSENSUS_PERIOD_TIME:CONSENSUS_PERIOD_TIME, MIN_POWER_POW_ACC_CREATE:MIN_POWER_POW_ACC_CREATE,
    };
    if(typeof Params === "object" && Params.Diagram)
    {
        var arrNames = ["MAX:ALL_NODES", "MAX:HASH_RATE_G"];
        Ret.arr = GET_STATDIAGRAMS(arrNames);
    }
    if(typeof Params === "object" && Params.BlockChain)
    {
        Ret.BlockChain = NodeBlockChain;
    }
    if(typeof Params === "object" && Params.ArrLog)
    {
        var ArrLog = [];
        for(var i = 0; i < ArrLogClient.length; i++)
        {
            var Item = ArrLogClient[i];
            if(!Item.final)
                continue;
            ArrLog.push(Item);
        }
        Ret.ArrLog = ArrLog;
    }
    return Ret;
};
var MaxCountViewRows = 20;
HostingCaller.GetAccountList = function (Params)
{
    if(typeof Params !== "object")
        return {result:0};
    if(Params.CountNum > MaxCountViewRows)
        Params.CountNum = MaxCountViewRows;
    if(!Params.CountNum)
        Params.CountNum = 1;
    var arr = DApps.Accounts.GetRowsAccounts(ParseNum(Params.StartNum), ParseNum(Params.CountNum));
    return {result:1, arr:arr};
};
HostingCaller.GetAccount = function (id)
{
    id = ParseNum(id);
    var arr = DApps.Accounts.GetRowsAccounts(id, 1);
    return {Item:arr[0], result:1};
};
HostingCaller.GetBlockList = function (Params)
{
    if(typeof Params !== "object")
        return {result:0};
    if(Params.CountNum > MaxCountViewRows)
        Params.CountNum = MaxCountViewRows;
    if(!Params.CountNum)
        Params.CountNum = 1;
    var arr = SERVER.GetRows(ParseNum(Params.StartNum), ParseNum(Params.CountNum));
    return {result:1, arr:arr};
};
HostingCaller.GetTransactionList = function (Params)
{
    return HostingCaller.GetTransactionAll(Params);
};
HostingCaller.GetTransactionAll = function (Params)
{
    if(typeof Params !== "object")
        return {result:0};
    if(Params.CountNum > MaxCountViewRows)
        Params.CountNum = MaxCountViewRows;
    if(!Params.CountNum)
        Params.CountNum = 1;
    if(Params.Param3)
        Params.BlockNum = Params.Param3;
    var arr = SERVER.GetTrRows(ParseNum(Params.BlockNum), ParseNum(Params.StartNum), ParseNum(Params.CountNum));
    return {result:1, arr:arr};
};
HostingCaller.GetDappList = function (Params)
{
    if(typeof Params !== "object")
        return {result:0};
    if(Params.CountNum > MaxCountViewRows)
        Params.CountNum = MaxCountViewRows;
    if(!Params.CountNum)
        Params.CountNum = 1;
    var arr = DApps.Smart.GetRows(ParseNum(Params.StartNum), ParseNum(Params.CountNum));
    return {result:1, arr:arr};
};
HostingCaller.GetNodeList = function (Params)
{
    var arr = [];
    var List;
    if(typeof Params === "object" && Params.All)
        List = AllNodeList;
    else
        List = HostNodeList;
    var MaxNodes = 20;
    var len = List.length;
    var UseRandom = 0;
    if(len > MaxNodes)
    {
        UseRandom = 1;
        len = MaxNodes;
    }
    var mapWasAdd = {};
    for(var i = 0; i < len; i++)
    {
        var Item;
        if(UseRandom)
        {
            var num = random(List.length);
            Item = List[num];
            if(mapWasAdd[Item.ip])
            {
                continue;
            }
            mapWasAdd[Item.ip] = 1;
        }
        else
        {
            Item = List[i];
        }
        var Value = {ip:Item.ip, port:Item.portweb, };
        if(typeof Params === "object" && Params.Geo)
        {
            if(!Item.Geo)
                SetGeoLocation(Item);
            Value.latitude = Item.latitude;
            Value.longitude = Item.longitude;
            Value.name = Item.name;
        }
        arr.push(Value);
    }
    return {result:1, arr:arr};
};
var AccountKeyMap = {};
var LastMaxNum = 0;
HostingCaller.GetAccountListByKey = function (Params,ppp,bRet)
{
    if(typeof Params !== "object" || !Params.Key)
        return {result:0, arr:[]};
    var Accounts = DApps.Accounts;
    for(var num = LastMaxNum; true; num++)
    {
        if(Accounts.IsHole(num))
            continue;
        var Data = Accounts.ReadState(num);
        if(!Data)
            break;
        var StrKey = GetHexFromArr(Data.PubKey);
        Data.Next = AccountKeyMap[StrKey];
        AccountKeyMap[StrKey] = Data;
    }
    LastMaxNum = num;
    var arr = [];
    var Item = AccountKeyMap[Params.Key];
    while(Item)
    {
        var Data = Accounts.ReadState(Item.Num);
        if(!Data)
            continue;
        if(!Data.PubKeyStr)
            Data.PubKeyStr = GetHexFromArr(Data.PubKey);
        if(Data.Currency)
            Data.CurrencyObj = DApps.Smart.ReadSimple(Data.Currency);
        if(Data.Value.Smart)
        {
            Data.SmartObj = DApps.Smart.ReadSimple(Data.Value.Smart);
            try
            {
                Data.SmartState = BufLib.GetObjectFromBuffer(Data.Value.Data, Data.SmartObj.StateFormat, {});
                if(typeof Data.SmartState === "object")
                    Data.SmartState.Num = Item.Num;
            }
            catch(e)
            {
                Data.SmartState = {};
            }
        }
        arr.unshift(Data);
        Item = Item.Next;
        if(arr.length >= 30)
            break;
    }
    var Ret = {result:1, arr:arr};
    if(bRet)
        return Ret;
    var Context = GetUserContext(Params);
    var StrInfo = JSON.stringify(Ret);
    if(!Params.AllData && Context.PrevAccountList === StrInfo)
    {
        return {result:0, cache:1};
    }
    Context.PrevAccountList = StrInfo;
    Context.NumAccountList++;
    return StrInfo;
};
HostingCaller.SendTransactionHex = function (Params,response)
{
    if(typeof Params !== "object" || !Params.Hex)
        return {result:0, text:"object requre"};
    process.RunRPC("AddTransactionFromWeb", Params.Hex, function (Err,text)
    {
        var Result = {result:!Err, text:text};
        var Str = JSON.stringify(Result);
        response.end(Str);
    });
    return null;
};
HostingCaller.DappSmartHTMLFile = function (Params)
{
    if(typeof Params !== "object")
        return {result:0};
    return HTTPCaller.DappSmartHTMLFile(Params);
};
HostingCaller.DappBlockFile = function (Params)
{
    if(typeof Params !== "object")
        return {result:0};
    return HTTPCaller.DappBlockFile(Params);
};
HostingCaller.DappInfo = function (Params)
{
    if(typeof Params !== "object")
        return {result:0};
    var SmartNum = ParseNum(Params.Smart);
    process.send({cmd:"SetSmartEvent", Smart:SmartNum});
    var Context = GetUserContext(Params);
    var Ret = HTTPCaller.DappInfo(Params, undefined, 1);
    Ret.PubKey = undefined;
    var StrInfo = JSON.stringify(Ret);
    if(!Params.AllData && Context.PrevDappInfo === StrInfo)
    {
        return {result:0, cache:1};
    }
    Context.PrevDappInfo = StrInfo;
    Context.NumDappInfo++;
    Context.LastTime = Date.now();
    Ret.NumDappInfo = Context.NumDappInfo;
    Ret.CurTime = Date.now();
    Ret.CurBlockNum = GetCurrentBlockNumByTime();
    Ret.BlockNumDB = SERVER.BlockNumDB;
    Ret.MaxAccID = DApps.Accounts.GetMaxAccount();
    Ret.MaxDappsID = DApps.Smart.GetMaxNum();
    return Ret;
};
HostingCaller.DappWalletList = function (Params)
{
    if(typeof Params !== "object")
        return {result:0};
    var Ret = HostingCaller.GetAccountListByKey(Params, undefined, 1);
    var Smart = ParseNum(Params.Smart);
    var arr = [];
    for(var i = 0; i < Ret.arr.length; i++)
    {
        if(Ret.arr[i].Value.Smart === Smart)
        {
            arr.push(Ret.arr[i]);
        }
    }
    Ret.arr = arr;
    return Ret;
};
HTTPCaller.DappWalletList = HostingCaller.DappWalletList;
HostingCaller.DappAccountList = function (Params)
{
    if(typeof Params !== "object")
        return {result:0};
    if(Params.CountNum > MaxCountViewRows)
        Params.CountNum = MaxCountViewRows;
    if(!Params.CountNum)
        Params.CountNum = 1;
    var arr = DApps.Accounts.GetRowsAccounts(ParseNum(Params.StartNum), ParseNum(Params.CountNum), undefined, 1);
    return {arr:arr, result:1};
};
HostingCaller.DappSmartList = function (Params)
{
    if(typeof Params !== "object")
        return {result:0};
    if(Params.CountNum > MaxCountViewRows)
        Params.CountNum = MaxCountViewRows;
    if(!Params.CountNum)
        Params.CountNum = 1;
    var arr = DApps.Smart.GetRows(ParseNum(Params.StartNum), ParseNum(Params.CountNum), undefined, undefined, Params.GetAllData,
    Params.TokenGenerate);
    return {arr:arr, result:1};
};
HostingCaller.DappBlockList = function (Params)
{
    if(typeof Params !== "object")
        return {result:0};
    if(Params.CountNum > MaxCountViewRows)
        Params.CountNum = MaxCountViewRows;
    if(!Params.CountNum)
        Params.CountNum = 1;
    var arr = SERVER.GetRows(ParseNum(Params.StartNum), ParseNum(Params.CountNum));
    return {arr:arr, result:1};
};
HostingCaller.DappTransactionList = function (Params)
{
    if(typeof Params !== "object")
        return {result:0};
    if(Params.CountNum > MaxCountViewRows)
        Params.CountNum = MaxCountViewRows;
    if(!Params.CountNum)
        Params.CountNum = 1;
    var arr = SERVER.GetTrRows(ParseNum(Params.BlockNum), ParseNum(Params.StartNum), ParseNum(Params.CountNum));
    return {arr:arr, result:1};
};
HostingCaller.DappStaticCall = function (Params)
{
    if(typeof Params !== "object")
        return {result:0};
    return HTTPCaller.DappStaticCall(Params);
};
var GlobalRunID = 0;
var GlobalRunMap = {};
process.RunRPC = function (Name,Params,F)
{
    if(F)
    {
        GlobalRunID++;
        try
        {
            process.send({cmd:"call", id:GlobalRunID, Name:Name, Params:Params});
            GlobalRunMap[GlobalRunID] = F;
        }
        catch(e)
        {
        }
    }
    else
    {
        process.send({cmd:"call", id:0, Name:Name, Params:Params});
    }
};
setInterval(function ()
{
    DApps.Accounts.Close();
    DApps.Smart.DBSmart.Close();
    global.BlockDB.CloseDBFile("block-header");
    global.BlockDB.CloseDBFile("block-body");
}, 500);
setInterval(function ()
{
    var MaxNumBlockDB = SERVER.GetMaxNumBlockDB();
    var arr = SERVER.GetStatBlockchain("POWER_BLOCKCHAIN", 100);
    if(arr.length)
    {
        var SumPow = 0;
        var Count = 0;
        for(var i = arr.length - 100; i < arr.length; i++)
            if(arr[i])
            {
                SumPow += arr[i];
                Count++;
            }
        var AvgPow = SumPow / Count;
        var HashRate = Math.pow(2, AvgPow) / 1024 / 1024 / 1024;
        ADD_TO_STAT("MAX:HASH_RATE_G", HashRate);
    }
    var Count = COUNT_BLOCK_PROOF + 16 - 1;
    if(MaxNumBlockDB > Count)
    {
        var StartNum = MaxNumBlockDB - Count;
        var BufWrite = SERVER.BlockChainToBuf(StartNum, StartNum, MaxNumBlockDB);
        NodeBlockChain = BufWrite;
    }
}, 1000);
