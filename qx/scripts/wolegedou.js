// 我嘞个豆 iOS 1.9.1（JS 1.9.22-alpha.46）
const url = $request.url;
let body = JSON.parse($response.body);

if (url.includes('/production/000/version.json')) {
    console.log('-更新弹窗');
    // 不能屏蔽更新：旧 JS 包从 OSS 加载的前端资源会被删除，停留旧版会卡在启动图
    body.autoUpdate = true;
} else if (url.includes('/rpc/fetch_my_monthly_cards')) {
    console.log('-月卡本地权益');
    const expiresAt = '2999-12-31T00:00:00+00:00';
    const remaining = Math.max(0, Math.floor((Date.parse(expiresAt) - Date.now()) / 1000));
    // 仅处理客户端先读本地缓存的项：开屏、库存分支、文件夹外观、智能豆板
    const localPlans = ['splash_ad_free', 'inventory_branch_unlimited', 'folder_pin_unlimited', 'lifetime_smartboard'];
    const found = new Set();
    for (const card of body || []) {
        if (!localPlans.includes(card.plan_id)) continue;
        found.add(card.plan_id);
        card.status = 'active';
        card.expires_at = expiresAt;
        card.remaining_seconds = remaining;
    }
    for (const id of localPlans) {
        if (!found.has(id)) console.log('-未找到 ' + id + '，未改动');
    }
} else if (url.includes('/rpc/fetch_active_announcements')) {
    console.log('-启动弹窗与首页公告');
    body = body.filter(item => !(item.surface || []).some(s => s === 'startup_modal' || s === 'home_banner'));
} else if (url.includes('/rpc/get_my_cover_save_exemption') || url.includes('/rpc/get_my_screenshot_exemption')) {
    console.log('-封面或截图豁免');
    body.allowance_ends_at = '2999-12-31T00:00:00+00:00';
} else if (url.includes('/rpc/get_my_publish_proof_exemption')) {
    console.log('-发布证明豁免');
    body.exempt = true;
    body.allowance = true;
    body.collapse_compliance = true;
} else if (url.includes('/rpc/get_my_board_prefix_entitlements')) {
    console.log('-豆板前缀授权');
    const endsAt = '2999-12-31T00:00:00+00:00';
    const items = Array.isArray(body.items) ? body.items.slice() : [];
    if (!items.some(item => item && item.name_prefix === '*')) {
        items.push({ name_prefix: '*', ends_at: endsAt });
    } else {
        for (const item of items) {
            if (item && item.name_prefix === '*') item.ends_at = endsAt;
        }
    }
    body.items = items;
}
$done({ body: JSON.stringify(body) });
