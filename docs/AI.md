# ניתוח AI והדמיות

## ניתוח שאלון

פונקציה: `supabase/functions/analyze-questionnaire/index.ts`.

קלט: `{ "project_id": "מזהה פרויקט" }`. הפונקציה טוענת פרויקט ותשובות, מייצרת הנחיה בעברית וקוראת למודל `google/gemini-2.5-flash` דרך Lovable AI. התוצאה מפוענחת ל־JSON ונשמרת ב־`analysis_results`.

הפרקים הצפויים: `emotional_profile`, `color_code`, `proportions`, `lighting_plan`, `materials_code`, `soundscape_strategy`, `spatial_transitions`, `implementation_timeline`; עשויות להופיע גם הצעות חדרים.

אם הפענוח נכשל, נשמר `raw_analysis`; זו אינה תוצאה מובנית תקינה למסך הפרקים ויש לבדוק את הפלט לפני הצגתו כהצלחה.

## הדמיות

פונקציה: `supabase/functions/generate-room-image/index.ts`.

קלט: `project_id`, `room_name`, ולפי הצורך `room_description`, `key_elements`, `analysis_context`. תחילה נוצרת הנחיה באנגלית באמצעות Gemini, ואז מתבצעת יצירת תמונה באמצעות `google/gemini-3.1-flash-image-preview`. כתובת התמונה נשמרת ב־`generated_images`.

הפונקציה קיימת בקוד, אך לא נמצא חיבור שלה למסך האפליקציה. אין להציג אותה כיכולת פעילה למשתמש.

## תפעול וגבולות

- כתובת השירות בקוד: `https://ai.gateway.lovable.dev/v1/chat/completions`.
- מפתחות והרשאות נדרשים בסביבת השירות בלבד; אין לכלול אותם בדפדפן או במאגר.
- ניתוח מטפל ב־402 כחוסר יתרה וב־429 כהגבלת בקשות. יש לבדוק כל פונקציה בנפרד ולא להניח טיפול אחיד.
- התקנה או סנכרון Git אינם הוכחה לפריסת הפונקציות או לזמינות המודלים.
- קוד הפונקציות משתמש בהרשאות שירות מוגברות; יש להשלים בדיקת משתמש ובעלות, כמפורט במדריך האבטחה.
- המלצות, קודי צבע ומידות דורשים אימות של אדריכל לפני ביצוע.
