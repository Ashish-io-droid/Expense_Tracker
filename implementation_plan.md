# SpendSync — final implementation plan

## Product decision

The tracker is a single, responsive `index.html` application. This keeps it easy to host on one shared link while avoiding build tooling. It works offline first in the browser and can be connected to Firebase Firestore for real-time two-device sync.

## Finished experience

### Transaction-first expense entry

- One purchase can contain any number of products.
- Every line captures product, category, quantity, unit price, and an automatic line total.
- The grand total updates instantly without losing the cursor while typing.
- Transactions include a name, date, and who paid; they can be opened, edited, or safely deleted.
- Top-ups record added money separately, keeping the joint-pot balance accurate; shared purchases are visibly included rather than lost in a personal split.

### Practical analysis

- Balance overview: invested, spent, remaining, and each person's paid spending.
- Dashboard filters for person, expense, and top-up.
- Category doughnut chart and ranked legend, plus product-by-cost and product-by-quantity charts.
- Six-month spending trend, person comparison, average transaction, daily and weekly pace, and largest purchase.
- Optional monthly budget, with a clear remaining/over-budget progress indicator.
- CSV export preserves every item as its own row for spreadsheet analysis, and a JSON backup preserves the complete ledger before a reset.

### Design and accessibility

- Dark midnight gradient with restrained glass cards, emerald/purple accents, and distinct category colors.
- Touch-friendly controls, mobile-first layout, semantic form labels, focus states, readable amounts, dark native dropdowns, and reduced-motion support.

## Sharing and safety

- Without Firebase configuration, data is saved only in the current browser using local storage.
- To sync, add a Firebase project configuration to `FIREBASE_CONFIG` and host the file on a static site.
- The supplied lightweight version has no account system. Firebase test mode is appropriate only for a short demonstration; a private long-term cloud ledger should add Firebase Authentication plus Firestore rules for the two owners.

## Data model

```json
{
  "meta": {
    "partnerA": "Name",
    "partnerB": "Name",
    "currency": "₹",
    "monthlyBudget": 0,
    "createdAt": "2026-08-17"
  },
  "transactions": [{
    "id": "t_unique",
    "type": "expense",
    "name": "Weekly groceries",
    "person": "Name",
    "date": "2026-08-17",
    "items": [{
      "product": "Rice 5 kg",
      "category": "food",
      "quantity": 1,
      "pricePerUnit": 350,
      "total": 350
    }],
    "total": 350,
    "createdAt": 1786950000000
  }]
}
```

## Verification checklist

1. Onboard with two names and an initial pot.
2. Enter an expense with two or more items and confirm line/grand totals.
3. Edit an entry, add a top-up, and verify the balance.
4. Check dashboard filters and Summary period tabs.
5. Set a budget in Settings and confirm the budget card reacts.
6. Export CSV and confirm every purchased product has its own row.
7. Configure Firebase before testing multi-device real-time sync.
