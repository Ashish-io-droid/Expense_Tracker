# SpendSync — shared expense tracker

`index.html` is the finished tracker. It lets the two of you add a full shopping basket to one expense, calculates every line and transaction total automatically, and turns the history into a clear spending summary.

## What it includes

- Multiple products in one transaction: product, category, quantity, unit price, and automatic line/grand totals.
- A running joint-pot balance, top-ups, payer filters (including shared purchases), editing, deletion confirmation, CSV export, and complete JSON backups.
- Category doughnut chart, product-by-cost and product-by-quantity rankings, six-month trend, per-person comparison, daily/weekly averages, largest purchase, and optional monthly-budget progress.
- Mobile-friendly dark glass design with accessible labels and responsive layout.

## Use it together

The file works immediately in one browser, where it saves privately on that device. To use **the same live data on both phones**, set up Firebase and publish the file:

1. In the [Firebase Console](https://console.firebase.google.com/), create a project and a **Firestore Database**.
2. Create a web app in that project and copy its configuration values into `FIREBASE_CONFIG` near the top of [index.html](C:/Users/singh/Downloads/Expense_Tracker/index.html).
3. While testing, Firestore's test mode will allow both phones to sync. Do **not** leave it public permanently: this lightweight version does not include sign-in, so a truly private cloud ledger needs Firebase Authentication and rules tailored to your two accounts.
4. Publish `index.html` through a static host such as GitHub Pages, Netlify, or Vercel, then both open the same published link.

Until Firebase is configured, the app deliberately stays in local-only mode so no financial entries are exposed online.

## Firebase + deployment checklist

1. In Firebase Console, create a project. In **Project settings → Your apps**, register a **Web** app and copy its configuration object.
2. In **Databases & Storage → Firestore**, create a **Standard** database in a nearby location. Select Test mode only to confirm that both phones can sync; it permits public access and is not suitable for permanent financial records.
3. Replace the empty values in `FIREBASE_CONFIG` near the top of `index.html`. Do not change the surrounding connection code.

```js
const FIREBASE_CONFIG = {
  apiKey: "paste-your-value",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.firebasestorage.app",
  messagingSenderId: "paste-your-value",
  appId: "paste-your-value"
};
```

4. From this folder, sign in to Firebase and deploy the included Hosting configuration:

```powershell
npx firebase-tools login
npx firebase-tools deploy --only hosting --project YOUR_PROJECT_ID
```

Firebase prints a `YOUR_PROJECT_ID.web.app` link. Open that same link on both phones. If you already entered data locally before configuring Firebase, open the deployed tracker first on that original device so it can upload the existing ledger.

The supplied `firebase.json` deploys only the tracker itself, not planning files or the unused React draft. For private long-term use, share the two Google email addresses that should have access; the app should then be upgraded to Firebase Authentication with Firestore rules before relying on cloud storage.

## A quick first entry

Start the tracker with both names and the amount invested. Then choose **Add Expense**, give the purchase a name, and enter every product from that receipt. Use **Settings** to add a monthly spending budget or to record more money added to the joint pot.
