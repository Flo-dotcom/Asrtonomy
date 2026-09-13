# بوت نادي الفلك — نسخة الصيانة

هذه النسخة تحافظ على أوامر الفلك والشطرنج والألعاب السابقة، مع إصلاحات تشغيلية وتحسينات للثبات.

## التشغيل

داخل مجلد البوت الذي يحتوي على `package.json`:

```bat
npm install
npm start
```

يجب أن يكون ملف `.env` في المجلد نفسه:

```env
DISCORD_TOKEN=توكن_البوت
DISCORD_CLIENT_ID=1496866946745110569
NASA_API_KEY=DEMO_KEY
```

## ما تم إصلاحه

- منع تكرار تنبيه الحدث نفسه كل ساعة.
- منع تكرار تنبيه محطة الفضاء خلال الساعة نفسها.
- حفظ بيانات النقاط والفعاليات والمواقع والتنبيهات بأمان داخل `data.json`.
- احتساب نقاط ألعاب خمن الكوكب، خريطة السماء، نيزك أم مذنب، وليلة الرصد.
- تحسين التحقق من أزرار الألعاب وانتهاء الجولات.
- إضافة ترتيب نقاط المنازل عبر `/astronomers-cup`.
- قبول أسماء الأبراج والأقسام مع أو بدون كلمة «برج» أو «قسم».
- تحسين رسائل الأخطاء مع إبقاء جميع الأوامر القديمة.

## أوامر الفلك

`/help`، `/fact`، `/planet`، `/moon`، `/quiz`، `/apod`، `/score`، `/leaderboard`، `/events`، `/rules`، `/sky`، `/iss`، `/space-events`، `/set-location`، `/alerts-on`، `/alerts-off`.

## أوامر الألعاب

`/magic-chess`، `/magic-move`، `/magic-board`، `/magic-resign`، `/star-fortune`، `/guess-planet`، `/sky-map`، `/planet-minute`، `/magic-sign`، `/observation-night`، `/meteor-comet`، `/astro-riddle`، `/astronomers-cup`، `/archive`.

## أوامر الإدارة

`/event-add`، `/warn`، `/clear`.

## ملاحظات الصلاحيات

فعّل **Server Members Intent** من Discord Developer Portal → Bot → Privileged Gateway Intents. يحتاج `/clear` إلى Manage Messages، ويحتاج `/warn` إلى Moderate Members، ويحتاج إنشاء الرتب التلقائي إلى Manage Roles وأن تكون رتبة البوت أعلى من الرتب التي ينشئها.

عند تحديث النسخة، أوقف القديمة بـ `Ctrl + C`، فك ضغط النسخة الجديدة، وانسخ إليها `.env` و`data.json`، ثم نفّذ `npm install` و`npm start`.

[رابط دعوة البوت](https://discord.com/oauth2/authorize?client_id=1496866946745110569&scope=bot%20applications.commands&permissions=84992)
