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

var MIN_VERSION = 868, COUNT_BLOCK_PROOF = 300, MIN_SUM_POWER = 35 * COUNT_BLOCK_PROOF, MainServer = void 0, MaxConnectedCount = 10,
MaxTimeConnecting = 3e3, StartTimeConnecting = 0, ConnectedCount = 0, NETWORK = "TERA-MAIN", ServerMap = {"127.0.0.1":{ip:"127.0.0.1",
        port:80, Name:"LOCAL"}, "terafoundation.org":{ip:"terafoundation.org", port:443, Name:"TERA", System:1}, "91.235.136.81":{ip:"91.235.136.81",
        port:80, Name:"SUPPORT1", System:1}, "149.154.70.158":{ip:"149.154.70.158", port:80, Name:"SUPPORT2", System:1}};

function InitTestEnv()
{
    NETWORK = "TERA-TEST", ServerMap = {"127.0.0.1":{ip:"127.0.0.1", port:80, Name:"LOCAL"}, "91.235.136.81":{ip:"91.235.136.81",
            port:88, Name:"SUPPORT1", System:1}, "149.154.70.158":{ip:"149.154.70.158", port:88, Name:"SUPPORT2", System:1}};
};

function StartWebWallet()
{
    console.log(NETWORK), $("idNetwork").innerHTML = NETWORK, OnInitWebWallet(), ConnectWebWallet();
};

function OnInitWebWallet()
{
    var e = localStorage.getItem(NETWORK + "NodesArrayList");
    if(e)
        for(var t = JSON.parse(e), o = 0; o < t.length; o++)
        {
            var r = ServerMap[t[o].ip];
            r && r.System || (ServerMap[t[o].ip] = t[o]);
        }
};

function SaveServerMap()
{
    var e = [];
    for(var t in ServerMap)
    {
        var o = ServerMap[t];
        o.SumPower >= MIN_SUM_POWER && e.push({ip:o.ip, port:o.port});
    }
    localStorage.setItem(NETWORK + "NodesArrayList", JSON.stringify(e));
};

function SetStatus(e)
{
    $("idStatus").innerHTML = e, console.log(e);
};

function SetError(e,t)
{
    SetStatus("<DIV  align='left' style='color:red'><B>" + e + "</B></DIV>");
};

function ConnectWebWallet()
{
    for(var e in StartTimeConnecting = Date.now(), ConnectedCount = 0, ServerMap)
    {
        ServerMap[e].SendHandShake = 0;
    }
    SetStatus("Connecting..."), LoopHandShake(), setTimeout(LoopWalletInfo, 1500);
};
var Stage = 0;

function LoopHandShake()
{
    for(var e in SetStatus("Connecting: " + ++Stage + "..."), ServerMap)
    {
        var t = ServerMap[e];
        !t.SendHandShake && t.port && DoNodeList(t);
    }
};

function DoNodeList(n)
{
    "https:" === window.location.protocol && 443 !== n.port || 443 === n.port && IsIPAddres(n.ip) || (n.SendHandShake = 1, GetData(GetProtocolServerPath(n) + "/GetNodeList",
        {}, function (e)
    {
        if(e && e.result && e.BlockChain && e.VersionNum >= MIN_VERSION)
        {
            ConnectedCount++, n.GetHandShake = 1, n.BlockChain = e.BlockChain;
            for(var t = 0, o = 0; o < e.arr.length; o++)
            {
                var r = e.arr[o];
                !ServerMap[r.ip] && r.port && (ServerMap[r.ip] = r, t = 1);
            }
            t && ConnectedCount < MaxConnectedCount && new Date - StartTimeConnecting < MaxTimeConnecting && setTimeout(LoopHandShake,
            100);
        }
    }));
};

function LoopWalletInfo()
{
    for(var e in SetStatus("Get wallets info..."), ServerMap)
    {
        var t = ServerMap[e];
        t.port && DoWalletInfo(t);
    }
    setTimeout(FindLider, 500);
};

function DoWalletInfo(t)
{
    "https:" === window.location.protocol && 443 !== t.port || 443 === t.port && IsIPAddres(t.ip) || (t.StartTime = Date.now(),
    t.SendWalletInfo = 1, GetData(GetProtocolServerPath(t) + "/GetCurrentInfo", {BlockChain:1}, function (e)
    {
        e && e.result && e.BlockChain && e.NETWORK === NETWORK && (t.Name = e.NODES_NAME, t.GetWalletInfo = 1, t.DeltaTime = new Date - t.StartTime,
        t.BlockChain = e.BlockChain, t.MaxNumBlockDB = e.MaxNumBlockDB, console.log("Get: " + t.ip + ":" + t.port + " delta=" + t.DeltaTime));
    }));
};

function FindLider()
{
    MainServer = void 0;
    var e = [], t = {};
    for(var o in ServerMap)
    {
        if((S = ServerMap[o]).GetWalletInfo && S.BlockChain)
        {
            var r = S.BlockChain;
            if(r.data && (r = r.data), S.SumPower = CalcPowFromBlockChain(r), S.SumPower < MIN_SUM_POWER)
            {
                console.log("Skip: " + S.ip + ":" + S.port + " SumPower(" + S.SumPower + ") < MIN_SUM_POWER(" + MIN_SUM_POWER + ")");
                continue;
            }
            t[S.SumPower] || (t[S.SumPower] = 0), t[S.SumPower]++, e.push(S);
        }
    }
    var n, a = 0;
    for(var o in t)
        t[o] >= a && (a = t[o], n = parseInt(o));
    e.sort(function (e,t)
    {
        return e.DeltaTime - t.DeltaTime;
    });
    for(var i = 0; i < e.length; i++)
    {
        var S;
        if((S = e[i]).SumPower === n)
        {
            SetStatus("Find " + S.ip + ":" + S.port + " with pow=" + S.SumPower + " " + a + "  ping=" + S.DeltaTime), MainServer = S, SaveServerMap();
            break;
        }
    }
    OnFindServer();
};

function CalcPowFromBlockChain(e)
{
    var t = 0, o = GetBlockArrFromBuffer(e);
    if(o.length === COUNT_BLOCK_PROOF)
        for(var r = 0; r < o.length; r++)
            t += o[r].Power;
    return t;
};
