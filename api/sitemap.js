mkdir api
mv sitemap.js api/sitemap.js
git add api/sitemap.js
git rm sitemap.js   # agar root pe tha
git commit -m "Move sitemap to api/"
git push
