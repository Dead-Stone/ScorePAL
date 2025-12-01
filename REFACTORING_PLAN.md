# ScorePAL Codebase Refactoring Plan

## Current Issues Analysis

### 1. Root Directory Clutter
- Multiple test files scattered (`test_*.py`, `*_demo.py`)
- Configuration files mixed with source code
- Deployment scripts in root directory
- No clear separation between source, tests, and deployment

### 2. Backend Architecture Problems
- **Monolithic `api.py`**: 3420 lines of mixed concerns
- **Service duplication**: Multiple grading services, extraction services
- **Mixed responsibilities**: API routes, business logic, utilities in same files
- **Inconsistent naming**: `grading_v2.py`, `grading_v3.py`, `extraction_service_v2.py`
- **Poor separation**: Core logic mixed with demos and tests

### 3. Frontend Structure Issues
- Mixed component organization
- No clear service layer
- Utilities scattered across directories

## Proposed Clean Architecture

### Root Directory Structure
```
ScorePAL/
├── src/                          # Source code
│   ├── backend/                  # Backend application
│   └── frontend/                 # Frontend application
├── tests/                        # All test files
├── docs/                         # Documentation
├── scripts/                      # Build and deployment scripts
├── config/                       # Configuration files
├── data/                         # Data storage
├── uploads/                      # File uploads
└── .github/                      # GitHub workflows
```

### Backend Architecture (Clean Architecture Pattern)
```
src/backend/
├── app/                         # Application entry point
│   ├── __init__.py
│   ├── main.py                  # FastAPI app initialization
│   └── config.py                # App configuration
├── api/                         # API layer (controllers)
│   ├── __init__.py
│   ├── v1/                      # API versioning
│   │   ├── __init__.py
│   │   ├── auth.py              # Authentication routes
│   │   ├── grading.py           # Grading routes
│   │   ├── files.py             # File handling routes
│   │   ├── ai_config.py         # AI configuration routes
│   │   ├── chat.py              # Chat routes
│   │   ├── rubric.py            # Rubric routes
│   │   ├── knowledge_graph.py   # Knowledge graph routes
│   │   └── canvas.py            # Canvas integration routes
│   └── middleware/               # API middleware
│       ├── __init__.py
│       ├── auth.py               # Authentication middleware
│       ├── cors.py               # CORS middleware
│       └── logging.py            # Logging middleware
├── core/                         # Core business logic
│   ├── __init__.py
│   ├── grading/                  # Grading domain
│   │   ├── __init__.py
│   │   ├── services/             # Grading services
│   │   ├── models/               # Grading models
│   │   └── repositories/         # Data access
│   ├── extraction/               # File extraction domain
│   │   ├── __init__.py
│   │   ├── services/             # Extraction services
│   │   ├── models/               # Extraction models
│   │   └── repositories/         # Data access
│   ├── ai/                       # AI services domain
│   │   ├── __init__.py
│   │   ├── services/             # AI service providers
│   │   ├── models/               # AI configuration models
│   │   └── repositories/         # Data access
│   └── auth/                     # Authentication domain
│       ├── __init__.py
│       ├── services/             # Auth services
│       ├── models/               # User models
│       └── repositories/         # Data access
├── infrastructure/                # External concerns
│   ├── __init__.py
│   ├── database/                 # Database layer
│   │   ├── __init__.py
│   │   ├── connection.py         # Database connections
│   │   ├── models/               # SQLAlchemy models
│   │   ├── repositories/         # Data access implementations
│   │   └── migrations/           # Database migrations
│   ├── external/                 # External services
│   │   ├── __init__.py
│   │   ├── canvas/               # Canvas LMS integration
│   │   ├── moodle/               # Moodle integration
│   │   ├── neo4j/                # Neo4j knowledge graph
│   │   └── ai_providers/         # AI service providers
│   └── storage/                  # File storage
│       ├── __init__.py
│       ├── local.py              # Local file storage
│       └── cloud.py              # Cloud storage (future)
├── shared/                       # Shared utilities
│   ├── __init__.py
│   ├── exceptions.py             # Custom exceptions
│   ├── constants.py              # Application constants
│   ├── utils/                    # Utility functions
│   │   ├── __init__.py
│   │   ├── encryption.py         # Encryption utilities
│   │   ├── file_utils.py         # File handling utilities
│   │   ├── validation.py         # Validation utilities
│   │   └── logging.py            # Logging utilities
│   └── types/                    # Type definitions
│       ├── __init__.py
│       ├── common.py             # Common types
│       └── api.py                # API types
└── tests/                        # Backend tests
    ├── __init__.py
    ├── unit/                     # Unit tests
    ├── integration/               # Integration tests
    └── fixtures/                 # Test fixtures
```

### Frontend Architecture (Feature-based)
```
src/frontend/
├── app/                          # Next.js app directory (if using App Router)
├── components/                   # Reusable components
│   ├── ui/                       # Base UI components
│   ├── forms/                    # Form components
│   ├── layout/                   # Layout components
│   └── features/                 # Feature-specific components
│       ├── auth/                 # Authentication components
│       ├── grading/              # Grading components
│       ├── dashboard/            # Dashboard components
│       └── settings/             # Settings components
├── lib/                          # Utility libraries
│   ├── api/                      # API client
│   ├── auth/                     # Authentication utilities
│   ├── utils/                    # General utilities
│   └── validations/              # Form validations
├── hooks/                        # Custom React hooks
├── contexts/                     # React contexts
├── types/                        # TypeScript types
├── styles/                       # Global styles
└── pages/                        # Page components (if using Pages Router)
```

## Refactoring Steps

### Phase 1: Clean Root Directory
1. Move all test files to `tests/` directory
2. Move demo files to `examples/` directory
3. Move configuration files to `config/` directory
4. Move deployment scripts to `scripts/` directory

### Phase 2: Backend Restructuring
1. Create new directory structure
2. Move and refactor core services
3. Separate API routes by domain
4. Implement proper dependency injection
5. Create clean interfaces between layers

### Phase 3: Frontend Restructuring
1. Organize components by feature
2. Create proper service layer
3. Implement proper state management
4. Clean up utility functions

### Phase 4: Testing and Documentation
1. Organize test files
2. Create comprehensive documentation
3. Implement proper CI/CD

## Benefits of New Structure

1. **Clear Separation of Concerns**: Each layer has a specific responsibility
2. **Maintainability**: Easy to locate and modify specific functionality
3. **Testability**: Clear boundaries make testing easier
4. **Scalability**: Easy to add new features without affecting existing code
5. **Team Collaboration**: Clear structure helps multiple developers work together
6. **Code Reusability**: Shared utilities and services can be reused
7. **Dependency Management**: Clear dependency flow between layers

## Migration Strategy

1. **Incremental Migration**: Refactor one domain at a time
2. **Backward Compatibility**: Maintain existing API endpoints during transition
3. **Comprehensive Testing**: Test each refactored component thoroughly
4. **Documentation Updates**: Update all documentation to reflect new structure
5. **Team Training**: Ensure team understands new architecture

## Timeline Estimate

- **Phase 1**: 1-2 days
- **Phase 2**: 1-2 weeks
- **Phase 3**: 3-5 days
- **Phase 4**: 2-3 days

**Total**: 2-3 weeks for complete refactoring 