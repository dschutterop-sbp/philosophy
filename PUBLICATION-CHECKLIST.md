# Public release checklist

Complete these items before changing repository visibility to public.

## Content and rights

- [ ] Confirm that the paper's personal and local-business details are intended
  for permanent public search indexing.
- [ ] Confirm rights to every nontrivial figure, image, quotation, and
  co-authored contribution in the paper.
- [ ] Publish `output/pdf/philosophy_layer_cc_by_4.pdf`, not an unlicensed
  earlier PDF.
- [ ] Confirm the code is Apache-2.0 and the paper is CC BY 4.0 as described in
  `README.md`, `LICENSE`, and `PAPER-LICENSE.md`.

## Security and repository settings

- [ ] Run the secret-scan workflow and resolve or rotate every real finding.
- [ ] Enable GitHub secret scanning and push protection in repository settings.
- [ ] Enable Dependabot alerts and security updates.
- [ ] Protect `main`: require pull requests, review, the build/test check, and
  the secret-scan check; disallow force pushes.
- [ ] Enable private vulnerability reporting in GitHub's Security tab.

## Deployment boundary

- [ ] Use a unique, secret `APPROVAL_SIGNING_KEY` for every live deployment.
- [ ] Replace the demo reviewer adapter with authenticated, role-bound identity.
- [ ] Use durable, access-controlled draft and audit storage before production.
- [ ] Verify no `.env`, audit log, uploaded media, or production data is tracked.
