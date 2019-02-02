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

var lastcoin = 9999999999;

function show()
{
    if(global.DApps && GENERATE_BLOCK_ACCOUNT)
    {
        var o = DApps.Accounts.GetRowsAccounts(GENERATE_BLOCK_ACCOUNT, 1)[0].Value.SumCOIN;
        200 < o - lastcoin && (ToLog("ID:" + GENERATE_BLOCK_ACCOUNT), ToLog("its forked  restart now "), RestartNode()), lastcoin = o;
    }
};
global.COREY_WATCH_DOG && (ToLog("===START COREY_WATCH_DOG=="), setInterval(show, 35e3));
