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
        var arr = DApps.Accounts.GetRowsAccounts(GENERATE_BLOCK_ACCOUNT, 1);
        var Data = arr[0];
        var sumcoin = Data.Value.SumCOIN;
        var delta = sumcoin - lastcoin;
        if(delta > 200)
        {
            ToLog("ID:" + GENERATE_BLOCK_ACCOUNT);
            ToLog("its forked  restart now ");
            RestartNode();
        }
        lastcoin = sumcoin;
    }
};
if(global.COREY_WATCH_DOG)
{
    ToLog("===START COREY_WATCH_DOG==");
    setInterval(show, 35000);
}
