# Publishing jest-swag to npm

## Prerequisites

1. **Create npm account** if you don't have one:

   ```bash
   npm adduser
   ```

2. **Login to npm:**

   ```bash
   npm login
   ```

3. **Check if package name is available:**
   ```bash
   npm search jest-swag
   ```

## Pre-publishing Checklist

- [ ] Update version in `package.json`
- [ ] Update author information in `package.json`
- [ ] Update repository URLs in `package.json`
- [ ] Build the project: `npm run build`
- [ ] Run tests: `npm test`
- [ ] Check package contents: `npm pack --dry-run`
- [ ] Review `.npmignore` file

## Publishing Steps

1. **Update package information:**

   ```bash
   # Update author
   npm config set init.author.name "Your Name"
   npm config set init.author.email "your.email@example.com"

   # Update package.json
   vim package.json
   ```

2. **Build and test:**

   ```bash
   npm run build
   npm test
   npm run lint
   ```

3. **Check package contents:**

   ```bash
   npm pack --dry-run
   ```

4. **Publish to npm:**

   ```bash
   # For first publish
   npm publish

   # For updates
   npm version patch  # or minor, major
   npm publish
   ```

## Package Structure

When published, the package will include:

```
jest-swag/
├── dist/              # Compiled JavaScript & TypeScript definitions
│   ├── index.js
│   ├── index.d.ts
│   ├── cli.js
│   ├── reporter.js
│   └── ...
├── package.json
├── README.md
└── LICENSE (if added)
```

## Post-publishing

1. **Verify publication:**

   ```bash
   npm view jest-swag
   ```

2. **Test installation:**

   ```bash
   mkdir test-installation
   cd test-installation
   npm init -y
   npm install jest-swag
   ```

3. **Update documentation:**
   - Add installation badges to README
   - Update npm package page description

## Version Management

Follow semantic versioning:

- **PATCH** (1.0.1): Bug fixes
- **MINOR** (1.1.0): New features, backward compatible
- **MAJOR** (2.0.0): Breaking changes

```bash
npm version patch   # 1.0.0 -> 1.0.1
npm version minor   # 1.0.1 -> 1.1.0
npm version major   # 1.1.0 -> 2.0.0
```

## Scoped Package (Alternative)

If `jest-swag` name is taken, consider a scoped package:

```json
{
  "name": "@yourusername/jest-swag"
}
```

Then publish with:

```bash
npm publish --access public
```
