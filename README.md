# CebuStays Pages Site

This repository contains only the static CebuStays frontend and images. The backend remains in the private source repository.

Set the Actions variable `CEBUSTAYS_API_BASE_URL` to `https://api.pikachubookingsite.com`, enable GitHub Pages with the GitHub Actions source, and configure `www.pikachubookingsite.com` in Pages settings.

The hotel rating and review interface in this site requires the backend API to serve saved hotel reviews and reservation review eligibility. Deploy the matching backend changes and apply its database migrations in the private source repository before expecting review submissions, Cebu Points rewards, or saved comments to work on the published site.
