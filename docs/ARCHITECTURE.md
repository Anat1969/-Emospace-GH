# מבנה האפליקציה

## שכבות

- ממשק: React 18, TypeScript, Vite 5, Tailwind CSS 3 ורכיבי shadcn/ui.
- ניווט: React Router; ספק TanStack Query מוגדר ברמת האפליקציה.
- שירותים: Lovable Cloud לניהול חשבונות, נתונים ופונקציות שירות.
- AI: קריאות מתוך פונקציות השירות בלבד, לא מהדפדפן.

## עמודים

| כתובת | קובץ | תפקיד |
| --- | --- | --- |
| `/` | `src/pages/Index.tsx` | פתיחה |
| `/auth` | `src/pages/Auth.tsx` | כניסה והרשמה |
| `/dashboard` | `src/pages/Dashboard.tsx` | רשימת פרויקטים |
| `/projects/new` | `src/pages/NewProject.tsx` | יצירה |
| `/projects/:id` | `src/pages/ProjectDetail.tsx` | ניהול פרויקט |
| `/projects/:id/results` | `src/pages/ProjectResults.tsx` | תוצאות |
| `/questionnaire/:token` | `src/pages/Questionnaire.tsx` | שאלון ציבורי |
| כל כתובת אחרת | `src/pages/NotFound.tsx` | עמוד לא נמצא |

## זרימת נתונים

חשבון אדריכל → פרויקט → קישור שאלון → תשובות לפי חלק → פונקציית ניתוח → תוצאה שמורה → תצוגת פרקים.

בדיקת כניסה במסך אינה מחליפה הרשאות נתונים או בדיקת בעלות בצד השירות. ראו [אבטחה](SECURITY.md).

## קבצים מרכזיים

`src/components/questionnaire/` מכיל את חלקי השאלון; `src/components/AIMenu.tsx` עוטף את תפריט A&I; `src/index.css` ו־`tailwind.config.ts` מגדירים את העיצוב; `supabase/functions/` מכיל את פונקציות AI; `supabase/migrations/` מכיל את הגדרות הנתונים ההיסטוריות.

הקבצים ב־`src/integrations/supabase/` הם קבצי חיבור וטיפוסים מנוהלים ואין לערוך אותם ידנית. שם התיקייה טכני; השירות בפרויקט הוא Lovable Cloud.
