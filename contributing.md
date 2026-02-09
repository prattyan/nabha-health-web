# Contributing to Nabha Rural Healthcare Telemedicine Platform

Thank you for your interest in contributing to the **Nabha Rural Healthcare Telemedicine Platform**! We welcome contributions from the community to help improve this social impact project designed to address healthcare challenges in rural Punjab.

## Getting Started

### Prerequisites

Before you begin, ensure you have the following installed on your machine:

- [Node.js](https://nodejs.org/) (v16 or higher recommended)
- [npm](https://www.npmjs.com/) (usually comes with Node.js)
- [Git](https://git-scm.com/)

### Installation

1. **Fork the repository** on GitHub.

2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/nabha-health-web.git
   cd nabha-health-web
   ```

3. **Add the upstream remote**:
   ```bash
   git remote add upstream https://github.com/prattyan/nabha-health-web.git
   ```

4. **Install dependencies**:
   ```bash
   npm install
   ```

5. **Start the development server**:
   ```bash
   npm run dev
   ```
   The application will be available at `http://localhost:5173`.

## Development Workflow

1. **Create a new branch** for your feature or bug fix:
   ```bash
   git checkout -b feature/your-feature-name
   # or
   git checkout -b fix/your-bug-fix
   ```

2. **Make your changes**. Ensure your code follows the project's coding standards.

3. **Verify your changes**:
   - **Lint**: Check for code style issues.
     ```bash
     npm run lint
     ```
   - **Type Check**: Ensure no TypeScript errors.
     ```bash
     npm run type-check
     ```
   - **Build**: Verify the project builds successfully.
     ```bash
     npm run build
     ```

4. **Commit your changes**:
   ```bash
   git commit -m "feat: Add new dashboard component"
   ```
   Please follow [Conventional Commits](https://www.conventionalcommits.org/) for your commit messages (e.g., `feat:`, `fix:`, `docs:`, `style:`, `refactor:`).

5. **Push to your fork**:
   ```bash
   git push origin feature/your-feature-name
   ```

6. **Open a Pull Request** against the `main` branch of the upstream repository (`prattyan/nabha-health-web`).

## Coding Standards

- **TypeScript**: We use TypeScript for strict type safety. Avoid using `any` types.
- **React**: Use Functional Components with Hooks.
- **Styling**: We use **Tailwind CSS**. Prefer utility classes over custom CSS files.
- **Icons**: Use `lucide-react` for icons.

## Project Structure

```
src/
 components/       # Reusable UI components
 contexts/         # React Contexts (Auth, Language)
 dashboards/       # Role-based dashboard views (Doctor, Patient, etc.)
 services/         # API services and business logic
 types/            # TypeScript type definitions
 modals/           # Modal dialog components
 auth/             # Authentication related components
```

## Reporting Issues

If you find a bug or have a feature request, please search the [Issue Tracker](https://github.com/prattyan/nabha-health-web/issues) to see if it has already been reported. If not, please open a new issue with a detailed description.

## License

By contributing, you agree that your contributions will be licensed under the project's license.
