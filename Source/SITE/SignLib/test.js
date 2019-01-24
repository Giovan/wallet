if(typeof window!=="object")
    window=global;
window.SignLib = require('secp256k1/lib/js')
window.Buffer = require('safe-buffer').Buffer

var hash0=[1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1];


//var PrivKey0=sha3("secret");
var PrivKey0=[2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,2];

var PrivKey=Buffer.from(PrivKey0);
var hash=Buffer.from(hash0);
var PubKey=SignLib.publicKeyCreate(PrivKey,1);


console.log("PrivKey="+GetHexFromArr(PrivKey));
console.log("PubKey="+GetHexFromArr(PubKey));




var Str=GetHexFromArr(SignLib.sign(hash, PrivKey,null,null).signature)
console.log("Str="+Str)


var PrivKey2=Buffer.from([3,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,3]);
var PubKey2=SignLib.publicKeyCreate(PrivKey2,1);
var Secret = SignLib.ecdh(PubKey, PrivKey2);
console.log("Secret="+GetHexFromArr(Secret));
var Secret2 = SignLib.ecdh(PubKey2, PrivKey);
console.log("Secret2="+GetHexFromArr(Secret2));

//YES

//для покера:
/*
 exports.privateKeyNegate = function (privateKey) {
 var bn = BN.fromBuffer(privateKey)
 if (bn.isZero()) return Buffer.alloc(32)

 if (bn.ucmp(BN.n) > 0) bn.isub(BN.n)
 return BN.n.sub(bn).toBuffer()
 }

 exports.privateKeyModInverse = function (privateKey) {
 var bn = BN.fromBuffer(privateKey)
 if (bn.isOverflow() || bn.isZero()) throw new Error(messages.EC_PRIVATE_KEY_RANGE_INVALID)

 return bn.uinvm().toBuffer()
 }


 exports.privateKeyTweakMul = function (privateKey, tweak) {
 var bn = BN.fromBuffer(tweak)
 if (bn.isOverflow() || bn.isZero()) throw new Error(messages.EC_PRIVATE_KEY_TWEAK_MUL_FAIL)

 var d = BN.fromBuffer(privateKey)
 return bn.umul(d).ureduce().toBuffer()
 }
*/

function GetHexFromArr(arr)
{
    if(!(arr instanceof Array) && arr.data)
        arr=arr.data;

    var Str="";
    for(var i=0;arr && i<arr.length;i++)
    {
        if(!arr[i])
            Str+="00";
        else
        {
            var Val=arr[i]&255;
            var A=Val.toString(16);
            if(A.length===1)
                A="0"+A;
            Str=Str+A;
        }
    }

    return Str.toUpperCase();
}

function GetArrFromHex(Str)
{
    var array=[];
    for(var i=0;Str && i<Str.length/2;i++)
    {
        array[i]=parseInt(Str.substr(i*2,2),16);
    }
    return array;
}
