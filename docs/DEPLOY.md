# Deploy API Documentation

This guide explains how to deploy the API documentation to GitHub Pages.

## Quick Deploy

### Option 1: Automatic Deployment (Recommended)

API docs auto-deploy when you push a version tag:

```bash
# Tag a release
git tag v5.0.0
git push origin v5.0.0
```

The [`deploy-docs.yml`](.github/workflows/deploy-docs.yml) workflow will:
1. Install dependencies
2. Generate TypeDoc documentation
3. Deploy to GitHub Pages
4. Display the deployment URL

### Option 2: Manual Deployment

Trigger deployment manually from GitHub:

1. Go to **Actions** tab
2. Select **Deploy API Docs to GitHub Pages**
3. Click **Run workflow**
4. Choose branch (usually `main`)
5. Click **Run workflow**

---

## Setup GitHub Pages

### First-Time Setup

1. **Enable GitHub Pages:**
   - Go to: `https://github.com/howlil/ez-agents/settings/pages`
   - Under **Build and deployment**:
     - Source: **GitHub Actions** (recommended)
   - Click **Save**

2. **Wait for First Deployment:**
   - The workflow will run automatically
   - Once complete, you'll see: `Your site is live at https://howlil.github.io/ez-agents/api/`

3. **Custom Domain (Optional):**
   - In Pages settings, add custom domain
   - Example: `api.ez-agents.dev`
   - Update DNS records as instructed

---

## Access Deployed Documentation

After deployment, access API docs at:

**Default URL:**
```
https://howlil.github.io/ez-agents/api/
```

**With Custom Domain:**
```
https://api.ez-agents.dev/
```

---

## Update README Badge

After first deployment, add this badge to README.md:

```markdown
[![API Reference](https://img.shields.io/badge/API-Reference-blue?style=for-the-badge&logo=typescript)](https://howlil.github.io/ez-agents/api/)
```

Add to documentation section:

```markdown
**Documentation:** 
[API Reference](https://howlil.github.io/ez-agents/api/) · 
[Architecture](docs/ARCHITECTURE.md) · 
[Contributing](CONTRIBUTING.md)
```

---

## Workflow Details

### Trigger Conditions

- **Automatic:** On push to tags matching `v*` (e.g., `v5.0.0`, `v5.1.0-rc1`)
- **Manual:** Via GitHub Actions UI (`workflow_dispatch`)

### Build Process

1. **Checkout** repository with full git history
2. **Setup Node.js** v20 with npm cache
3. **Install dependencies** (production only)
4. **Generate TypeDoc** → `docs/api/`
5. **Verify** generated files exist
6. **Upload** to GitHub Pages
7. **Deploy** and display URL

### Generated Files

```
docs/api/
├── index.html          # Main documentation page
├── assets/
│   ├── js/
│   │   └── main.js     # Documentation JavaScript
│   ├── css/
│   │   └── main.css    # Documentation styles
│   └── icons/          # TypeDoc icons
└── modules/            # Module documentation
```

---

## Troubleshooting

### Deployment Fails

**Check build logs:**
```
https://github.com/howlil/ez-agents/actions/runs/{RUN_ID}
```

**Common issues:**
- Missing `typedoc.json` configuration
- TypeScript compilation errors
- Missing dependencies

**Fix:**
```bash
# Test locally first
npm run docs:api

# Verify output
ls -la docs/api/
```

### Pages Not Updating

**Wait 1-2 minutes** — GitHub Pages has propagation delay.

**Force refresh:**
```bash
# Re-run workflow
gh workflow run deploy-docs.yml

# Or trigger from GitHub Actions UI
```

### 404 Error

**Ensure GitHub Pages is enabled:**
1. Go to Settings → Pages
2. Verify GitHub Actions is selected as source
3. Check deployment status

---

## Versioning Strategy

### Release Tags

| Tag Pattern | Example | Deployment |
|-------------|---------|------------|
| `v{major}.{minor}.{patch}` | `v5.0.0` | ✅ Auto-deploy |
| `v{major}.{minor}.{patch}-rc.{n}` | `v5.0.0-rc.1` | ✅ Auto-deploy |
| `v{major}.{minor}.{patch}-beta.{n}` | `v5.0.0-beta.1` | ✅ Auto-deploy |

### Documentation Versions

Each tag creates a **permanent snapshot** of API docs at that version.

**Access specific version:**
```
# Latest (default)
https://howlil.github.io/ez-agents/api/

# Specific version (requires manual setup)
https://howlil.github.io/ez-agents/api/v5.0.0/
```

---

## Advanced: Custom Domain

### Setup Steps

1. **Add CNAME file:**
   ```bash
   echo "api.ez-agents.dev" > docs/CNAME
   ```

2. **Configure DNS:**
   ```
   Type: CNAME
   Name: api
   Value: howlil.github.io
   TTL: 3600
   ```

3. **Update GitHub Pages:**
   - Settings → Pages → Custom domain
   - Enter: `api.ez-agents.dev`
   - Click **Save**

4. **Enable HTTPS:**
   - Check **Enforce HTTPS** after DNS propagates

---

## Cost

**GitHub Pages is FREE** for:
- Unlimited public repositories
- 100 GB bandwidth/month
- 1 GB storage

**Suitable for:**
- ✅ Open source projects
- ✅ Documentation sites
- ✅ Project landing pages

**Not suitable for:**
- ❌ E-commerce sites
- ❌ High-traffic applications

---

## See Also

- [GitHub Pages Documentation](https://docs.github.com/en/pages)
- [TypeDoc Documentation](https://typedoc.org/guides/)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
