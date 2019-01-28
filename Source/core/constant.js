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

global.UPDATE_CODE_VERSION_NUM = 879;
global.MIN_CODE_VERSION_NUM = 873;
global.MINING_VERSION_NUM = 2;
global.InitParamsArg = InitParamsArg;
global.CONST_NAME_ARR = ["AUTO_COORECT_TIME", "DELTA_CURRENT_TIME", "COMMON_KEY", "NODES_NAME", "SERVER_PRIVATE_KEY_HEX", "USE_NET_FOR_SERVER_ADDRES",
"NET_WORK_MODE", "STAT_MODE", "MAX_STAT_PERIOD", "HTTP_PORT_NUMBER", "HTTP_PORT_PASSWORD", "HTTP_IP_CONNECT", "WALLET_NAME",
"WALLET_DESCRIPTION", "COUNT_VIEW_ROWS", "USE_HINT", "ALL_VIEW_ROWS", "ALL_LOG_TO_CLIENT", "USE_MINING", "MINING_START_TIME",
"MINING_PERIOD_TIME", "POW_MAX_PERCENT", "COUNT_MINING_CPU", "SIZE_MINING_MEMORY", "POW_RUN_COUNT", "POW_RUN_COUNT_FIND", "USE_AUTO_UPDATE",
"RESTART_PERIOD_SEC", "MAX_GRAY_CONNECTIONS_TO_SERVER", "TRANSACTION_PROOF_COUNT", "UPDATE_NUM_COMPLETE", "HARD_PACKET_PERIOD120",
"LIMIT_SEND_TRAFIC", "MIN_VER_STAT", "STOPGETBLOCK", "WATCHDOG_DEV", "ADDRLIST_MODE", "CheckPointDelta", "DEBUG_WALLET", "HTTP_HOSTING_PORT",
"HTTPS_HOSTING_DOMAIN", "WATCHDOG_BADACCOUNT", ];
global.USE_TICKET = 0;
global.USE_CHECK_SENDING = 1;
global.USE_LEVEL_WAY = 0;
global.TR_TICKET_HASH_LENGTH = 10;
global.BLOCKNUM_TICKET_ALGO = 16070000;
global.WATCHDOG_BADACCOUNT = 1;
global.WATCHDOG_DEV = 0;
global.DEBUG_WALLET = 0;
global.CHECK_GLOBAL_TIME = 1;
global.AUTO_COORECT_TIME = 1;
global.DELTA_CURRENT_TIME = 0;
global.NODES_NAME = "";
global.COMMON_KEY = "";
global.SERVER_PRIVATE_KEY_HEX = undefined;
global.USE_NET_FOR_SERVER_ADDRES = 1;
global.NET_WORK_MODE = undefined;
global.STAT_MODE = 0;
global.MAX_STAT_PERIOD = 1 * 3600;
global.UPDATE_NUM_COMPLETE = 0;
global.WALLET_NAME = "TERA";
global.WALLET_DESCRIPTION = "";
global.USE_MINING = 0;
global.POW_MAX_PERCENT = 50;
global.POW_RUN_COUNT_FIND = 1000;
global.POW_RUN_COUNT = 5000;
global.POWRunPeriod = 1;
global.CheckPointDelta = 20;
global.ALL_LOG_TO_CLIENT = 1;
global.LIMIT_SEND_TRAFIC = 0;
global.COUNT_VIEW_ROWS = 20;
global.MIN_VER_STAT = 0;
global.STOPGETBLOCK = 0;
global.RESTART_PERIOD_SEC = 0;
global.HARD_PACKET_PERIOD120 = 160;
global.MINING_START_TIME = "";
global.MINING_PERIOD_TIME = "";
global.CHECK_RUN_MINING = 21 * 1000;
global.CHECK_STOP_CHILD_PROCESS = 10 * 1000;
global.COUNT_MINING_CPU = 0;
global.SIZE_MINING_MEMORY = 0;
global.HTTP_HOSTING_PORT = 0;
global.HTTPS_HOSTING_DOMAIN = "";
require("./startlib.js");
global.MIN_POWER_POW_HANDSHAKE = 12;
global.USE_HINT = 0;
global.ALL_VIEW_ROWS = 0;
global.COUNT_BLOCK_PROOF = 300;
global.MIN_POWER_POW_MSG = 2;
global.MEM_POOL_MSG_COUNT = 1000;
global.MAX_LEVEL_SPECIALIZATION = 24;
global.MIN_CONNECT_CHILD = 2;
global.MAX_CONNECT_CHILD = 7;
global.MAX_NODES_RETURN = 100;
global.MAX_WAIT_PERIOD_FOR_STATUS = 10 * 1000;
global.MAX_GRAY_CONNECTIONS_TO_SERVER = 10;
global.MAX_PACKET_LENGTH = 450 * 1024;
global.COUNT_BLOCKS_FOR_LOAD = 600;
global.TR_LEN = 100;
global.BLOCK_PROCESSING_LENGTH = 8;
global.BLOCK_PROCESSING_LENGTH2 = BLOCK_PROCESSING_LENGTH * 2;
global.CONSENSUS_PERIOD_TIME = 1000;
global.MAX_BLOCK_SIZE = 130 * 1024;
global.MAX_TRANSACTION_SIZE = 65535;
global.MIN_TRANSACTION_SIZE = 32;
global.MAX_TRANSACTION_COUNT = 2000;
global.MAX_TRANSACTION_LIMIT = 15;
global.MIN_POWER_POW_TR = 10;
if(global.MIN_POWER_POW_BL === undefined)
    global.MIN_POWER_POW_BL = 5;
global.GENERATE_BLOCK_ACCOUNT = 0;
global.TOTAL_TER_MONEY = 1e9;
global.TRANSACTION_PROOF_COUNT = 1000 * 1000;
global.MIN_POWER_POW_ACC_CREATE = 16;
global.START_MINING = 2 * 1000 * 1000;
global.REF_PERIOD_MINING = 1 * 1000 * 1000;
global.DELTA_BLOCK_ACCOUNT_HASH = 1000;
global.PERIOD_ACCOUNT_HASH = 50;
global.START_BLOCK_ACCOUNT_HASH = 14500000;
global.BLOCK_COUNT_IN_MEMORY = 40;
global.HISTORY_BLOCK_COUNT = 40;
global.MAX_SIZE_LOG = 200 * 1024 * 1024;
global.READ_ONLY_DB = 0;
global.USE_CHECK_SAVE_DB = 1;
global.START_NETWORK_DATE = 1530446400000;
global.NETWORK = "TERA-MAIN";
global.DEF_MAJOR_VERSION = "0001";
global.SMART_BLOCKNUM_START = 10000000;
global.PRICE_DAO = function (BlockNum)
{
    return {NewAccount:10, NewSmart:100, NewTokenSmart:10000};
};
if(global.LOCAL_RUN)
{
    var Num = Date.now() - 50 * 1000;
    global.START_NETWORK_DATE = Math.trunc(Num / 1000) * 1000;
}
InitParamsArg();
if(global.LOCAL_RUN)
{
    global.DELTA_BLOCK_ACCOUNT_HASH = 30;
    global.PERIOD_ACCOUNT_HASH = 10;
    global.START_BLOCK_ACCOUNT_HASH = 1;
    global.BLOCKNUM_TICKET_ALGO = 1;
    global.SMART_BLOCKNUM_START = 0;
    global.START_MINING = 60;
    global.REF_PERIOD_MINING = 10;
    global.TEST_TRANSACTION_GENERATE = 0;
    global.MIN_POWER_POW_TR = 8;
    global.MIN_POWER_POW_ACC_CREATE = 8;
    NETWORK = "LOCAL";
    global.ALL_VIEW_ROWS = 1;
}
else
    if(global.TEST_NETWORK)
    {
        var Num = Date.now() - 50 * 1000;
        console.log("CURRENT NUM: " + (Math.trunc(Num / 1000) * 1000));
        global.SMART_BLOCKNUM_START = 0;
        global.START_NETWORK_DATE = 1544879533000 + 170000 * 1000;
        global.START_MINING = 1000;
        global.REF_PERIOD_MINING = 1000;
        global.MIN_POWER_POW_TR = 8;
        global.MIN_POWER_POW_ACC_CREATE = 8;
        global.TRANSACTION_PROOF_COUNT = 200 * 1000;
        global.MAX_SIZE_LOG = 20 * 1024 * 1024;
        global.DELTA_BLOCK_ACCOUNT_HASH = 1000;
        global.START_BLOCK_ACCOUNT_HASH = 1000;
        global.BLOCKNUM_TICKET_ALGO = 1296300;
        global.WALLET_NAME = "TEST";
        NETWORK = "TERA-TEST";
        if(global.START_PORT_NUMBER === undefined)
            global.START_PORT_NUMBER = 40000;
        global.ALL_VIEW_ROWS = 1;
    }
if(global.LOCAL_RUN)
{
    global.BLOCKNUM_TICKET_ALGO = 0;
    global.MIN_POWER_POW_TR = 0;
    global.AUTO_COORECT_TIME = 0;
    global.CHECK_GLOBAL_TIME = 0;
}
global.GetNetworkName = function ()
{
    return NETWORK + "-" + DEF_MAJOR_VERSION;
};
global.DEF_VERSION = DEF_MAJOR_VERSION + "." + UPDATE_CODE_VERSION_NUM;
global.DEF_CLIENT = "TERA-CORE";
global.FIRST_TIME_BLOCK = START_NETWORK_DATE;
global.START_BLOCK_RUN = 0;
if(global.START_IP === undefined)
    global.START_IP = "";
if(global.START_PORT_NUMBER === undefined)
    global.START_PORT_NUMBER = 30000;
if(global.HTTP_PORT_PASSWORD === undefined)
    global.HTTP_PORT_PASSWORD = "";
if(global.HTTP_IP_CONNECT === undefined)
    global.HTTP_IP_CONNECT = "";
if(global.USE_AUTO_UPDATE === undefined)
    global.USE_AUTO_UPDATE = 1;
if(global.USE_PARAM_JS === undefined)
    global.USE_PARAM_JS = 1;
if(global.DATA_PATH === undefined)
    global.DATA_PATH = "";
if(global.CREATE_ON_START === undefined)
    global.CREATE_ON_START = false;
if(global.LOCAL_RUN === undefined)
    global.LOCAL_RUN = 0;
if(global.CODE_PATH === undefined)
    global.CODE_PATH = process.cwd();
if(global.DEBUG_MODE === undefined)
    global.DEBUG_MODE = 0;
global.DEBUG_MODE = 0;
if(typeof window === 'object')
{
    window.RUN_CLIENT = 0;
    window.RUN_SERVER = 1;
}
global.RUN_CLIENT = 0;
global.RUN_SERVER = 1;

function InitParamsArg()
{
    for(var i = 1; i < process.argv.length; i++)
    {
        var str0 = process.argv[i];
        var str = str0.toUpperCase();
        if(str.substr(0, 9) == "HTTPPORT:")
        {
            global.HTTP_PORT_NUMBER = parseInt(str.substr(9));
        }
        else
            if(str.substr(0, 9) == "PASSWORD:")
            {
                global.HTTP_PORT_PASSWORD = str0.substr(9);
            }
            else
                if(str.substr(0, 5) == "PATH:")
                    global.DATA_PATH = str0.substr(5);
                else
                    if(str.substr(0, 5) == "PORT:")
                        global.START_PORT_NUMBER = parseInt(str.substr(5));
                    else
                        if(str.substr(0, 3) == "IP:")
                            global.START_IP = str.substr(3);
                        else
                            if(str.substr(0, 8) == "HOSTING:")
                            {
                                global.HTTP_HOSTING_PORT = parseInt(str.substr(8));
                            }
                            else
                                if(str.substr(0, 13) == "STARTNETWORK:")
                                {
                                    global.START_NETWORK_DATE = parseInt(str.substr(13));
                                    console.log("START_NETWORK_DATE: " + START_NETWORK_DATE);
                                }
                                else
                                {
                                    switch(str)
                                    {
                                        case "CHILDPOW":
                                            global.CHILD_POW = true;
                                            break;
                                        case "ADDRLIST":
                                            global.ADDRLIST_MODE = true;
                                            break;
                                        case "CREATEONSTART":
                                            global.CREATE_ON_START = true;
                                            break;
                                        case "LOCALRUN":
                                            global.LOCAL_RUN = 1;
                                            break;
                                        case "TESTRUN":
                                            global.TEST_NETWORK = 1;
                                            break;
                                        case "NOLOCALRUN":
                                            global.LOCAL_RUN = 0;
                                            break;
                                        case "NOAUTOUPDATE":
                                            global.USE_AUTO_UPDATE = 0;
                                            break;
                                        case "NOPARAMJS":
                                            global.USE_PARAM_JS = 0;
                                            break;
                                        case "READONLYDB":
                                            global.READ_ONLY_DB = 1;
                                            break;
                                        case "NWMODE":
                                            global.NWMODE = 1;
                                            break;
                                        case "NOALIVE":
                                            global.NOALIVE = 1;
                                            break;
                                        case "DEV_MODE":
                                            global.DEV_MODE = 1;
                                            break;
                                    }
                                }
    }
};
