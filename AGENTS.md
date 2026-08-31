# OnMangeOu — application mobile client

Dépôt autonome de l'expérience publique Android/iOS.

## Référence

- Spécification maître : `docs/reference/OnMangeOu_Specification_Technique_Maitre.md`
- Tokens de marque : `docs/reference/onmangeou-tokens.json`

## Périmètre

Découverte anonyme, fiche restaurant, favoris authentifiés, connexion OTP. Les commandes, le panier et le paiement appartiennent aux tranches suivantes.

## Commandes

```bash
pnpm start
pnpm typecheck
pnpm test
```

API : `EXPO_PUBLIC_API_URL` (défaut `http://localhost:3000/api/v1`).

## Règles impératives

- TypeScript strict, aucun `any`.
- Textes utilisateur uniquement via i18n `fr-CI`.
- Composants internes fondés sur les tokens ; pas de bibliothèque visuelle tierce.
- Jetons dans `expo-secure-store`.
- Découverte possible sans compte.
- Montants affichés en FCFA entier, jamais de flottant.
