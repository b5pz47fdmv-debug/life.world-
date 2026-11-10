# הפעלת GitHub Pages: מדריך מהאייפון

את הפעולה הזו עושים **פעם אחת בלבד**. מכאן והלאה כל עדכון מתפרסם לבד.

## שלב 1: הפעלת Pages
1. פתח ב־Safari את הכתובת: `https://github.com/b5pz47fdmv-debug/life.world-/settings/pages`
   (אם האתר מציג גרסת מובייל מצומצמת, גלול לתחתית העמוד ולחץ על **Desktop version**.)
2. תחת **Build and deployment**, בשדה **Source**, בחר **GitHub Actions**.
3. זה הכול. אין צורך ללחוץ על כפתור שמירה, כי ההגדרה נשמרת מיד.

## שלב 2: הרצת הפרסום הראשון
1. פתח את הכתובת: `https://github.com/b5pz47fdmv-debug/life.world-/actions`
2. בחר את התהליך **Build & Deploy to GitHub Pages**.
3. לחץ **Run workflow**, ואז **Run workflow** פעם נוספת.
4. המתן כ־2 דקות, עד שמופיע ✅ ירוק.

> אם תהליך כבר רץ לפני שהפעלת את Pages, הוא נכשל בשלב ה־deploy. זה תקין: פשוט הרץ אותו שוב לפי שלב 2.

## שלב 3: פתיחה באייפון
- לוח הבקרה: `https://b5pz47fdmv-debug.github.io/life.world-/`
- המשחק: `https://b5pz47fdmv-debug.github.io/life.world-/projects/games/hotel-tycoon/`

### התקנה כאפליקציה במסך הבית
ב־Safari לחץ על כפתור השיתוף (⬆️), ואז על **הוסף למסך הבית**. המשחק ייפתח במסך מלא, עם אייקון משלו.

## פתרון בעיות
| מה רואים | מה עושים |
|---|---|
| בתהליך מופיעה השגיאה `Get Pages site failed` או `Not Found` | Pages עדיין לא הופעל. חזור לשלב 1. |
| השגיאה `Branch ... is not allowed to deploy to github-pages` | פתח את Settings ← Environments ← github-pages, ותחת Deployment branches הוסף את הענף. |
| הקישור מחזיר 404 | המתן דקה או שתיים אחרי ה־✅, ואז רענן את הדף. |
| שינוי חדש לא מופיע | Safari שומר דפים במטמון. סגור את הלשונית ופתח אותה מחדש. |
