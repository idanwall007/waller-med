# אתגר המדיטציה של וולר — אתר סטטי

אתר סטטי בעמוד יחיד (`index.html`) — ללא תהליך build, ללא תלויות.

## מבנה הקבצים

```
deploy/
├─ index.html      ← העמוד הראשי
├─ favicon.svg     ← אייקון לטאב
├─ vercel.json     ← הגדרות Vercel (כותרות אבטחה + URLs נקיים)
└─ README.md       ← הקובץ הזה
```

---

## העלאה ל־Vercel — שתי דרכים

### דרך 1: גרירה ישירה (הכי מהיר, ללא git)

1. נכנסים ל־https://vercel.com ונרשמים (אפשר דרך GitHub / Google).
2. בדשבורד לוחצים **Add New… → Project**.
3. בחלון שנפתח גוררים את **תיקיית `deploy/` כולה** (לא רק את index.html) לאזור ההעלאה,
   או לוחצים **"deploy a template / import a third-party"** ובוחרים **"deploy a folder"**.
4. Vercel מזהה אוטומטית שזה אתר סטטי — לוחצים **Deploy**.
5. תוך ~30 שניות מקבלים כתובת חיה כמו `waller-meditation.vercel.app`.

> אם Vercel מבקש Framework Preset — בוחרים **Other** (או **Static**).
> אם מבקש Build Command או Output Directory — משאירים ריק.

### דרך 2: דרך GitHub (מומלץ לטווח ארוך)

1. יוצרים repo חדש ב־GitHub ומעלים את כל תוכן `deploy/` ל־root של ה־repo.
2. ב־Vercel: **Add New → Project → Import Git Repository** ובוחרים את ה־repo.
3. **Deploy**. מעכשיו כל push ל־main יפרסם אוטומטית גרסה חדשה.

---

## חיבור דומיין משלך

1. בפרויקט ב־Vercel: **Settings → Domains → Add**.
2. מקלידים את הדומיין (למשל `waller-meditation.co.il`).
3. Vercel מציג רשומות DNS — נכנסים לפאנל של רשם הדומיין (GoDaddy/Namecheap/וכו') ומדביקים אותן.
4. תוך כמה דקות עד שעה — הדומיין חי + SSL חינמי אוטומטי.

---

## בדיקות אחרי העלאה

- [ ] טעינת גופנים מ־Google Fonts תקינה (יש חיבור אינטרנט בעת הטעינה).
- [ ] הדף נראה תקין בנייד (DevTools → Toggle Device Toolbar).
- [ ] שיתוף בוואטסאפ — מציג כותרת ותיאור (משתמש בתגי og המוטמעים).
- [ ] favicon מופיע בטאב הדפדפן.

---

## עריכה עתידית

לעריכת תוכן: פותחים את `index.html` בכל עורך טקסט (VS Code / Notepad++ / Sublime).
התוכן בעברית נמצא בתוך `<section class="fold">` — מחפשים את הטקסט שרוצים לשנות ועורכים.

לאחר עריכה:
- **דרך 1**: גוררים שוב את התיקייה ל־Vercel (הוא יזהה שזה אותו פרויקט).
- **דרך 2**: `git push` — Vercel מפרסם אוטומטית.
