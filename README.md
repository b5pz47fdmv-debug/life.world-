# life.world · סטודיו יצירתי בענן

מאגר אחד שמכיל **פרויקטים נפרדים ועצמאיים**: משחקים, אפליקציות ווב, קמפיינים, אתרי שיווק וחוויות ויזואליות.
כל ממשק נבנה קודם כל לאייפון.

## 🔗 קישורים חיים
- לוח הבקרה: `https://b5pz47fdmv-debug.github.io/life.world-/`
- HOTEL TYCOON: `https://b5pz47fdmv-debug.github.io/life.world-/projects/games/hotel-tycoon/`

> הקישורים יעבדו אחרי הפעלת GitHub Pages פעם אחת. ההוראות נמצאות ב־[docs/github-pages-setup.md](docs/github-pages-setup.md).

## 📁 מבנה
```
projects/
  apps/          אפליקציות ווב
  games/         משחקים          ← hotel-tycoon/
  campaigns/     קמפיינים פרסומיים
  sites/         אתרי שיווק
  experiences/   חוויות ויזואליות
templates/       תבניות פתיחה לכל קטגוריה
shared/          עיצוב משותף (שימוש בו הוא אופציונלי)
scripts/         build-site.sh בונה את כל הפרויקטים לאתר אחד
index.html       לוח הבקרה הראשי
```

## ⚙️ איך זה עובד
- כל דחיפה של קוד ל־GitHub מפעילה את **GitHub Actions**. התהליך מריץ את הבדיקות, בונה כל פרויקט ומפרסם הכול ל־**GitHub Pages**.
- פרויקט שיש לו `package.json` נבנה עם `npm run build`. פרויקט בלי `package.json` מתפרסם כמו שהוא.
- שגיאה בפרויקט אחד עוצרת את הפרסום, וכך אתר שבור לא עולה לאוויר.
