// 来源：https://raw.githubusercontent.com/app2smile/rules/master/js/spotify-qx-header.js
let headers = $request.headers;
delete headers['If-None-Match'];
console.log('2025.03.20-qx-spotify删除请求头')
$done({headers});
