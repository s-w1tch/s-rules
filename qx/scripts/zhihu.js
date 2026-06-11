// const rsp = require('../debug.json');
// let url = 'v4/questions';
let url = $request.url;
let rsp = JSON.parse($response.body);
if (url.includes("/recommendations")) {
    console.log('-回答底部广告');
    rsp.data = [];
} else if (url.includes('topstory/recommend')) {
    console.log('-首页推荐广告');
    rsp.data = rsp.data.filter(item => !item.hasOwnProperty('adjson'));
} else if (url.includes('v4/questions')) {
    // if (rsp.hasOwnProperty('ad_info')) {
    console.log('-问题中间广告');
    rsp.ad_info = {
        "position": 3,
        "ad": {},
        "adjson": ""
    };
    let new_data_list = [];
    for (let temp_data of rsp.data) {
        let item_real_id = temp_data.url.split('/').slice(-1)[0];
        if (String(temp_data.id) != item_real_id) {
            console.log(`-ID越界: url: ${item_real_id} -> id: ${temp_data.id}`)
            temp_data.id = item_real_id;
        }
        new_data_list.push(temp_data);
    }
    rsp.data = new_data_list
    // }
}
$done(JSON.stringify(rsp));
