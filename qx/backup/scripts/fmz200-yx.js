// 来源：https://raw.githubusercontent.com/fmz200/wool_scripts/main/Scripts/yx.js
/**
 * 悠洗APP
 */

let obj = JSON.parse($response.body);
obj.data.topFunctionalArea.splice(5);
$done({body: JSON.stringify(obj)});
