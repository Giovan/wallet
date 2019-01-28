## API

This API is available if the node is running public http-access. Set the constant HTTP_HOSTING_PORT.

#### Getting the current status of the blockchain
http://194.1.237.94:80/GetCurrentInfo?Diagram=0

Result:
* MaxNumBlockDB - the maximum block number stored in the database (the current height of the blockchain)
* CurBlockNum - new block to create
* MaxAccID - current maximum account number
* MaxDappsID  - current maximum Dapp number
* VersionNum - version of the program on which the node works


An example of the result:
```
{"result":1,"VersionNum":706,"MaxNumBlockDB":12371158,"CurBlockNum":12371166,"MaxAccID":187783,"MaxDappsID":20,"FIRST_TIME_BLOCK":1530446400000}
```

#### Get a list of nodes that have a public API
http://194.1.237.94:80/GetNodeList

An example of the result:
```
{"arr":[{"ip":"149.154.70.158","port":80},{"ip":"195.211.195.236","port":88}],"result":1}
```


#### Getting a list of accounts
http://194.1.237.94:88/GetAccountList?StartNum=0&CountNum=1

An example of the result:
```
{"arr":[{"Currency":0,"PubKey":{"type":"Buffer","data":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},"Name":"System account","Value":{"SumCOIN":735207181,"SumCENT":160466160,"OperationID":29702004,"Smart":0,"Data":{"type":"Buffer","data":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]}},"BlockNumCreate":0,"Adviser":0,"Reserve":{"type":"Buffer","data":[0,0,0,0,0,0,0,0,0]},"Num":0,"WN":"","PubKeyStr":"000000000000000000000000000000000000000000000000000000000000000000"}],"result":1}
```

#### Getting a list of blocks 
http://194.1.237.94:88/GetBlockList?StartNum=12373020&CountNum=1

An example of the result:
```
{"arr":[{"Info":"","TreeHash":[21,49,137,245,12,76,228,206,53,77,30,148,98,24,170,149,57,42,182,70,241,34,109,212,139,164,6,188,58,123,144,148],"AddrHash":[59,221,2,0,0,0,245,10,0,0,0,0,51,114,239,24,0,0,83,43,13,45,0,0,109,0,111,11,175,220,151,110],"PrevHash":[43,137,15,86,33,224,34,209,250,223,179,165,117,195,85,221,20,170,165,242,21,224,66,113,34,236,242,73,175,220,151,110],"SumHash":[161,234,144,48,195,161,175,59,95,210,65,224,12,209,47,194,107,237,238,253,203,103,50,204,176,175,14,165,123,176,151,31],"SumPow":343061509,"BodyFileNum":0,"TrDataPos":171851211,"TrDataLen":45,"TrCount":0,"BlockNum":12373020,"SeqHash":[203,159,178,200,40,56,216,192,98,72,79,17,138,85,110,107,9,236,236,192,221,31,8,3,64,220,78,104,23,69,185,237],"Hash":[201,154,249,76,189,63,83,170,17,113,155,168,49,61,237,225,23,82,25,64,252,187,83,235,66,123,53,140,224,15,213,30],"PowHash":[0,0,0,0,0,43,172,90,172,102,174,20,63,206,173,42,64,212,122,194,192,206,0,19,247,148,244,38,50,110,104,65],"Power":42,"bSave":true,"Prepared":true,"Num":12373020,"Miner":187707,"Hash1":[0,0,0,0,0,43,172,90,172,102,174,20,63,206,173,42,64,212,122,194,192,206,0,19,247,148,244,38,50,110,104,65],"Hash2":[0,0,0,0,0,0,26,182,13,93,155,155,161,188,243,123,15,140,197,136,187,52,200,57,96,167,222,160,83,243,232,92]}],"result":1}
```

#### Getting a list of block transactions
http://194.1.237.94:88/GetTransactionList?BlockNum=12373020?StartNum=0&CountNum=10

An example of the result:
```
{"arr":[{"body":{"type":"Buffer","data":[119,52,200,188,0,0,0,191,18,76,46,177,111,26,110,203,159,23,235,146,77,199,1,149,89,136,142,14,63,114,189,13,6,60,28,76,11,146,102]},"num":6656082722574,"hashPow":[21,49,137,245,12,76,228,206,53,77,30,148,98,24,170,149,57,42,182,70,241,34,109,212,139,164,6,188,58,123,144,148],"HASH":[21,49,137,245,12,76,228,206,53,77,30,148,98,24,170,149,57,42,182,70,241,34,109,212,139,164,6,188,58,123,144,148],"power":3,"TimePow":6656082722578.715,"Num":0,"Type":119,"Length":39,"Body":[119,52,200,188,0,0,0,191,18,76,46,177,111,26,110,203,159,23,235,146,77,199,1,149,89,136,142,14,63,114,189,13,6,60,28,76,11,146,102],"Script":"{\n  \"Type\": 119,\n  \"BlockNum\": 12372020,\n  \"Hash\": \"BF124C2EB16F1A6ECB9F17EB924DC7019559888E0E3F72BD0D063C1C4C0B9266\"\n}","Verify":1,"VerifyHTML":"<B style='color:green'>”</B>"}],"result":1}
```


#### Getting a list of DAPs

http://194.1.237.94:88/GetDappList?StartNum=8&CountNum=1

An example of the result:
```
{"arr":[{"Version":0,"TokenGenerate":0,"ISIN":"","Zip":0,"BlockNum":10034043,"TrNum":0,"IconBlockNum":10033892,"IconTrNum":0,"ShortName":"","Name":"List-Lib","Account":187007,"AccountLength":1,"Category1":40,"Category2":0,"Category3":0,"Owner":186573,"Reserve":{"type":"Buffer","data":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},"StateFormat":"","Description":"List-lib v1.0","Num":"8","CodeLength":3705,"HTMLLength":0}],"result":1}
```



#### Getting a list of accounts by public key
http://194.1.237.94:80/GetAccountListByKey?Key=027AE0DCE92D8BE1F893525B226695DDF0FE6AD756349A76777FF51F3B59067D70

Result:
```
{"result":1,"arr":[{"Currency":0,"PubKey":{"type":"Buffer","data":[2,122,224,220,233,45,139,225,248,147,82,91,34,102,149,221,240,254,106,215,86,52,154,118,119,127,245,31,59,89,6,125,112]},"Name":"Founder account","Value":{"SumCOIN":40000005,"SumCENT":0,"OperationID":7,"Smart":0,"Data":{"type":"Buffer","data":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]}},"BlockNumCreate":0,"Adviser":0,"Reserve":{"type":"Buffer","data":[0,0,0,0,0,0,0,0,0]},"Num":8,"WN":""}]}
```
Note: public key in hex format can be taken from the wallet on EXPLORER -> Accounts (PubKey column)


#### Sending a transaction
http://194.1.237.94:80/SendTransactionHex?Hex=6F030000000000002D00000000000100000000008400000000000100000000000000000004007465737425000000000000007AA29739FD458DF8AB1139881DAA4584CCDA3D4995B6849FB1F55F3B2EA40704116647823E97A60C70213EFA8D83CBFBEE6D753FCA6771B4792985B57186F3BCFBCEC0000000930600000000

Result:
```
{"result":1,"text":"OK"}
```


Note: The transaction in hex format can be obtained if you use a functions from the js-library
* The library is located at: https://github.com/terafoundation/wallet/raw/master/Bin/Light/Tera-light.zip
* Example: http://dappsgate.com/test-api.html

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Test2-API </title>


    <script type="text/javascript" src="./JS/client.js"></script>
    <script type="text/javascript" src="./JS/sha3.js"></script>
    <script type="text/javascript" src="./JS/crypto-client.js"></script>
    <script type="text/javascript" src="./JS/terahashlib.js"></script>
    <script type="text/javascript" src="./JS/wallet-lib.js"></script>
    <script type="text/javascript" src="./JS/sign-lib-min.js"></script>

    <script>

        //Init
        window.onload=function ()
        {
            window.DELTA_FOR_TIME_TX=4;
            window.MainServer={ip:"dappsgate.com",port:80};

            //run every 1 sec for getting current block number and network time
            setInterval(function ()
            {
                GetData("GetCurrentInfo",{}, function (Data)
                {
                    if(Data && Data.result)
                        SetBlockChainConstant(Data);
                });
            },1000);
        }


        //Use API
        function SignTr()
        {
            var PrivKey=$("idPrivKey").value;
            var TR=JSON.parse($("idTr").value);




            GetSignTransaction(TR,PrivKey,function ()
            {
                TR.Sign=GetHexFromArr(TR.Sign);
                $("idTr").value=JSON.stringify(TR,"",4);
            });
        }

        function GetHexFromTr()
        {
            var TR=JSON.parse($("idTr").value);
            var Body=GetArrFromTR(TR);
            if(!TR.Sign)
            {
                $("idOut").value="Error: sign tx";
                return "";
            }

            var Arr=GetArrFromHex(TR.Sign);
            WriteArr(Body,Arr,64);
            Body.length+=12;
            CreateHashBodyPOWInnerMinPower(Body);
            var StrHex=GetHexFromArr(Body);

            $("idOut").value=StrHex;
            return StrHex;
        }

        function SendTr()
        {
            var StrHex=GetHexFromTr();
            if(!StrHex)
                return;

            GetData("SendTransactionHex",{Hex:StrHex}, function (Data)
            {
                if(Data && Data.result)
                {
                    $("idOut").value=Data.text;
                }
                else
                {
                    if(Data)
                        $("idOut").value="Error: "+Data.text;
                    else
                        $("idOut").value="Error";
                }

            });
        }

    </script>
</head>
<body>

<B>Priv key:</B>
<INPUT type="search" id="idPrivKey" value="7AF1726733E39D95DD7E9DAD1F6F2B76D0477B3B604439B1353B97BC24A72844" style="width: 600px"><BR>
<B>Tx</B> (after each transaction is sent, the OperationID number is increased by 1):<BR>
<textarea id="idTr" rows="20" cols="98">
{
    "Type": 111,
    "Version": 3,
    "Reserve": 0,
    "FromID": 189115,
    "OperationID": 2,
    "To": [
        {
            "PubKey": "",
            "ID": 9,
            "SumCOIN": 0,
            "SumCENT": 1
        }
    ],
    "Description": "Test",
    "Body": "",
    "Sign": ""
}
</textarea><BR>
<B>Actions:</B><BR>
<button onclick="SignTr()">Sign Tx</button>
<button onclick="GetHexFromTr()">Get Hex</button>
<button onclick="SendTr()">Send tx</button>

<BR><B>Result:</B><BR>
<textarea id="idOut" rows="20" cols="98"></textarea>
</body>
</html>
```

