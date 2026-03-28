---
name: data_modeling_v1
description: Data modeling patterns, dimensional modeling, normalization, schema design, and database architecture for analytics and transactions
version: 1.0.0
tags: [data-engineering, data-modeling, dimensional-modeling, schema-design, database-design, data-warehouse]
category: data
triggers:
  keywords: [data modeling, dimensional modeling, schema design, star schema, snowflake, normalization, database design]
  filePatterns: [models/*.ts, schema/*.ts, migrations/*.ts, data-model/*.ts]
  commands: [data modeling, schema design, database design]
  projectArchetypes: [data-warehouse, analytics-platform, oltp-system, olap-system]
  modes: [greenfield, refactor, optimization]
prerequisites:
  - data_pipeline_v1
  - postgresql_advanced_skill_v1
recommended_structure:
  directories:
    - src/models/
    - src/models/dimensions/
    - src/models/facts/
    - src/migrations/
    - src/schema/
workflow:
  setup:
    - Understand business requirements
    - Identify business processes
    - Define grain of data
    - Select modeling approach
  generate:
    - Design dimension tables
    - Design fact tables
    - Define relationships
    - Create schema migrations
  test:
    - Data integrity tests
    - Query performance tests
    - Schema validation tests
best_practices:
  - Start with business processes
  - Define clear grain statements
  - Use surrogate keys for dimensions
  - Handle slowly changing dimensions
  - Denormalize for analytics
  - Normalize for transactions
  - Document data lineage
anti_patterns:
  - Modeling without business input
  - No grain definition
  - Over-normalization for analytics
  - Under-normalization for OLTP
  - No SCD strategy
  - Missing audit columns
tools:
  - dbt (data modeling)
  - ER/Studio, PowerDesigner
  - SQLDBM, dbdiagram.io
  - Great Expectations (validation)
metrics:
  - Query performance
  - Data freshness
  - Schema change frequency
  - Data quality score
  - Model coverage
---

# Data Modeling Skill

## Overview

This skill provides comprehensive guidance on data modeling, including dimensional modeling for analytics, normalization for transactions, schema design patterns, slowly changing dimensions, and database architecture for both OLTP and OLAP systems.

Data modeling is the process of creating a conceptual representation of data structures and relationships. Good data modeling enables efficient queries, data integrity, and scalable systems.

## When to Use

- **New database design** for applications
- **Data warehouse construction**
- **Schema evolution** planning
- **Performance optimization** of existing models
- **Data integration** projects
- **Analytics platform** development

## When NOT to Use

- **Simple key-value storage** needs
- **Document storage** without relationships
- **Prototypes** where schema will change rapidly

---

## Core Concepts

### 1. Dimensional Modeling (Kimball)

#### Star Schema
```typescript
// Fact Table: Sales transactions
interface FactSales {
  // Foreign keys to dimensions
  date_key: number;        // FK to dim_date
  time_key: number;        // FK to dim_time
  product_key: number;     // FK to dim_product
  customer_key: number;    // FK to dim_customer
  store_key: number;       // FK to dim_store
  
  // Measures (facts)
  sales_amount: number;
  sales_quantity: number;
  discount_amount: number;
  tax_amount: number;
  profit_amount: number;
  
  // Degenerate dimensions (stored in fact)
  order_number: string;
  line_number: number;
}

// Dimension Tables
interface DimDate {
  date_key: number;        // Surrogate key (YYYYMMDD)
  date: Date;
  day_of_week: number;
  day_of_month: number;
  day_of_year: number;
  week_of_year: number;
  month: number;
  quarter: number;
  year: number;
  is_weekend: boolean;
  is_holiday: boolean;
}

interface DimProduct {
  product_key: number;     // Surrogate key
  product_id: string;      // Natural key (from source)
  product_name: string;
  description: string;
  category: string;
  subcategory: string;
  brand: string;
  price: number;
  cost: number;
  is_active: boolean;
  effective_date: Date;
  expiry_date: Date;
}

interface DimCustomer {
  customer_key: number;    // Surrogate key
  customer_id: string;     // Natural key
  customer_name: string;
  email: string;
  phone: string;
  gender: string;
  birth_date: Date;
  age_group: string;       // Derived attribute
  segment: string;         // Derived attribute
  address_line1: string;
  address_line2: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  latitude: number;
  longitude: number;
}

// SQL Schema
const createFactSales = `
CREATE TABLE fact_sales (
  sales_key BIGSERIAL PRIMARY KEY,
  date_key INTEGER NOT NULL REFERENCES dim_date(date_key),
  time_key INTEGER NOT NULL REFERENCES dim_time(time_key),
  product_key INTEGER NOT NULL REFERENCES dim_product(product_key),
  customer_key INTEGER NOT NULL REFERENCES dim_customer(customer_key),
  store_key INTEGER NOT NULL REFERENCES dim_store(store_key),
  
  sales_amount DECIMAL(18, 2) NOT NULL,
  sales_quantity INTEGER NOT NULL,
  discount_amount DECIMAL(18, 2) DEFAULT 0,
  tax_amount DECIMAL(18, 2) DEFAULT 0,
  profit_amount DECIMAL(18, 2) GENERATED ALWAYS AS (sales_amount - cost_amount) STORED,
  
  order_number VARCHAR(50) NOT NULL,
  line_number INTEGER NOT NULL,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE (order_number, line_number)
);

CREATE INDEX idx_fact_sales_date ON fact_sales(date_key);
CREATE INDEX idx_fact_sales_product ON fact_sales(product_key);
CREATE INDEX idx_fact_sales_customer ON fact_sales(customer_key);
`;
```

#### Snowflake Schema
```typescript
// Normalized dimensions (snowflake)
interface DimProduct {
  product_key: number;
  product_id: string;
  product_name: string;
  description: string;
  category_key: number;    // FK to dim_category
  brand_key: number;       // FK to dim_brand
  price: number;
  cost: number;
}

interface DimCategory {
  category_key: number;
  category_id: string;
  category_name: string;
  parent_category_key: number; // Self-referencing for hierarchy
  level: number;
}

interface DimBrand {
  brand_key: number;
  brand_id: string;
  brand_name: string;
  manufacturer_key: number; // FK to dim_manufacturer
}

// When to use snowflake vs star:
// - Star: Simpler queries, better for BI tools
// - Snowflake: Less redundancy, better for complex hierarchies
```

### 2. Slowly Changing Dimensions (SCD)

#### Type 1: Overwrite (No History)
```typescript
class SCDType1Handler {
  async updateDimension(
    naturalKey: string, 
    newAttributes: Record<string, any>
  ): Promise<void> {
    // Simply overwrite existing record
    await db.query(`
      UPDATE dim_customer
      SET 
        customer_name = $1,
        email = $2,
        city = $3,
        updated_at = CURRENT_TIMESTAMP
      WHERE customer_id = $4
    `, [
      newAttributes.name,
      newAttributes.email,
      newAttributes.city,
      naturalKey
    ]);
  }
}

// Use when: History not important, correcting errors
```

#### Type 2: Add New Row (Full History)
```typescript
class SCDType2Handler {
  async updateDimension(
    naturalKey: string,
    newAttributes: Record<string, any>
  ): Promise<void> {
    await db.transaction(async (tx) => {
      // 1. Expire current record
      await tx.query(`
        UPDATE dim_customer
        SET expiry_date = CURRENT_DATE,
            is_current = FALSE
        WHERE customer_id = $1 AND is_current = TRUE
      `, [naturalKey]);

      // 2. Get current record's surrogate key for reference
      const currentRecord = await tx.query(`
        SELECT customer_key FROM dim_customer
        WHERE customer_id = $1 AND is_current = FALSE
        ORDER BY expiry_date DESC LIMIT 1
      `, [naturalKey]);

      // 3. Insert new record
      await tx.query(`
        INSERT INTO dim_customer (
          customer_id, customer_name, email, city,
          effective_date, expiry_date, is_current
        ) VALUES ($1, $2, $3, $4, CURRENT_DATE, '9999-12-31', TRUE)
      `, [
        naturalKey,
        newAttributes.name,
        newAttributes.email,
        newAttributes.city
      ]);
    });
  }
}

// Use when: Full history tracking required
```

#### Type 3: Add New Column (Limited History)
```typescript
class SCDType3Handler {
  // Table has current and previous value columns
  async updateDimension(
    naturalKey: string,
    newAttributes: Record<string, any>
  ): Promise<void> {
    await db.query(`
      UPDATE dim_customer
      SET 
        previous_city = city,
        previous_city_date = city_change_date,
        city = $1,
        city_change_date = CURRENT_DATE
      WHERE customer_id = $2
    `, [newAttributes.city, naturalKey]);
  }
}

// Schema for Type 3
const dimCustomerType3 = `
CREATE TABLE dim_customer (
  customer_key SERIAL PRIMARY KEY,
  customer_id VARCHAR(50) UNIQUE NOT NULL,
  customer_name VARCHAR(100),
  
  -- Current values
  city VARCHAR(100),
  city_change_date DATE,
  
  -- Previous values (Type 3)
  previous_city VARCHAR(100),
  previous_city_date DATE,
  
  is_current BOOLEAN DEFAULT TRUE,
  effective_date DATE DEFAULT CURRENT_DATE,
  expiry_date DATE DEFAULT '9999-12-31'
);
`;

// Use when: Only need to track last change
```

### 3. Normalization (OLTP)

#### First Normal Form (1NF)
```typescript
// ❌ Bad: Repeating groups
interface OrderBad {
  order_id: number;
  customer_name: string;
  product1: string;
  product2: string;
  product3: string;
  price1: number;
  price2: number;
  price3: number;
}

// ✅ Good: 1NF - Atomic values, no repeating groups
interface Order1NF {
  order_id: number;
  customer_name: string;
  // Products in separate table
}

interface OrderItem {
  order_id: number;
  product_id: number;
  quantity: number;
  price: number;
}
```

#### Second Normal Form (2NF)
```typescript
// ❌ Bad: Partial dependency
interface OrderItemBad {
  order_id: number;
  product_id: number;
  quantity: number;
  product_name: string;  // Depends only on product_id
  product_price: number; // Depends only on product_id
}

// ✅ Good: 2NF - No partial dependencies
interface OrderItem2NF {
  order_id: number;
  product_id: number;
  quantity: number;
  unit_price: number;  // Price at time of order
}

interface Product {
  product_id: number;
  product_name: string;
  list_price: number;
}
```

#### Third Normal Form (3NF)
```typescript
// ❌ Bad: Transitive dependency
interface OrderBad {
  order_id: number;
  customer_id: number;
  customer_name: string;     // Depends on customer_id
  customer_city: string;     // Depends on customer_id
  customer_state: string;    // Depends on customer_id
}

// ✅ Good: 3NF - No transitive dependencies
interface Order3NF {
  order_id: number;
  customer_id: number;
  order_date: Date;
  status: string;
}

interface Customer {
  customer_id: number;
  customer_name: string;
  city_id: number;  // Reference to location
}

interface Location {
  city_id: number;
  city: string;
  state: string;
  country: string;
}
```

### 4. Data Model Patterns

#### Hierarchy Pattern
```typescript
// Self-referencing table for hierarchies
interface OrganizationUnit {
  org_id: number;
  org_name: string;
  parent_org_id: number | null;  // Self-reference
  org_level: number;
  org_path: string;  // Materialized path
}

const createOrgHierarchy = `
CREATE TABLE organization_units (
  org_id SERIAL PRIMARY KEY,
  org_name VARCHAR(100) NOT NULL,
  parent_org_id INTEGER REFERENCES organization_units(org_id),
  org_level INTEGER NOT NULL,
  org_path VARCHAR(500) NOT NULL,
  
  CONSTRAINT chk_level CHECK (org_level >= 0)
);

-- Index for hierarchy queries
CREATE INDEX idx_org_parent ON organization_units(parent_org_id);
CREATE INDEX idx_org_path ON organization_units(org_path);
`;

// Query: Get all descendants
const getDescendants = `
SELECT * FROM organization_units
WHERE org_path LIKE '/1/%'  -- All under org_id 1
ORDER BY org_path;
`;
```

#### Bridge Table Pattern (Many-to-Many)
```typescript
// Bridge table for account assignments
interface AccountAssignment {
  account_key: number;
  customer_key: number;
  role: string;           // 'owner', 'joint', 'authorized'
  effective_date: Date;
  expiry_date: Date;
  is_current: boolean;
}

const createAccountBridge = `
CREATE TABLE account_customer_bridge (
  account_key INTEGER NOT NULL REFERENCES dim_account(account_key),
  customer_key INTEGER NOT NULL REFERENCES dim_customer(customer_key),
  role VARCHAR(50) NOT NULL,
  effective_date DATE NOT NULL DEFAULT CURRENT_DATE,
  expiry_date DATE NOT NULL DEFAULT '9999-12-31',
  is_current BOOLEAN NOT NULL DEFAULT TRUE,
  
  PRIMARY KEY (account_key, customer_key, effective_date)
);

CREATE INDEX idx_bridge_account ON account_customer_bridge(account_key);
CREATE INDEX idx_bridge_customer ON account_customer_bridge(customer_key);
`;
```

#### Periodic Snapshot Fact Table
```typescript
// Daily account balance snapshot
interface FactAccountBalanceDaily {
  date_key: number;
  account_key: number;
  customer_key: number;
  
  // Measures
  balance: number;
  credits: number;
  debits: number;
  transaction_count: number;
}

const createSnapshotFact = `
CREATE TABLE fact_account_balance_daily (
  snapshot_date_key INTEGER NOT NULL REFERENCES dim_date(date_key),
  account_key INTEGER NOT NULL REFERENCES dim_account(account_key),
  customer_key INTEGER NOT NULL REFERENCES dim_customer(customer_key),
  
  balance DECIMAL(18, 2) NOT NULL,
  credits DECIMAL(18, 2) DEFAULT 0,
  debits DECIMAL(18, 2) DEFAULT 0,
  transaction_count INTEGER DEFAULT 0,
  
  PRIMARY KEY (snapshot_date_key, account_key)
);

-- Partition by date for large tables
CREATE TABLE fact_account_balance_daily (
  ...
) PARTITION BY RANGE (snapshot_date_key);
`;
```

#### Accumulating Snapshot Fact Table
```typescript
// Order fulfillment tracking
interface FactOrderFulfillment {
  order_key: number;
  
  // Dates (FK to dim_date)
  order_date_key: number;
  payment_date_key: number | null;
  ship_date_key: number | null;
  delivery_date_key: number | null;
  
  // Measures
  order_amount: number;
  ship_lag_days: number | null;      // ship - order
  delivery_lag_days: number | null;  // delivery - order
  status: string;
}

const createAccumulatingFact = `
CREATE TABLE fact_order_fulfillment (
  order_key INTEGER PRIMARY KEY REFERENCES dim_order(order_key),
  
  order_date_key INTEGER NOT NULL REFERENCES dim_date(date_key),
  payment_date_key INTEGER REFERENCES dim_date(date_key),
  ship_date_key INTEGER REFERENCES dim_date(date_key),
  delivery_date_key INTEGER REFERENCES dim_date(date_key),
  
  order_amount DECIMAL(18, 2) NOT NULL,
  ship_lag_days INTEGER GENERATED ALWAYS AS (
    CASE WHEN ship_date_key IS NOT NULL 
         THEN ship_date_key - order_date_key 
    END
  ) STORED,
  delivery_lag_days INTEGER GENERATED ALWAYS AS (
    CASE WHEN delivery_date_key IS NOT NULL 
         THEN delivery_date_key - order_date_key 
    END
  ) STORED,
  
  status VARCHAR(50) NOT NULL,
  last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
`;
```

### 5. Schema Evolution

```typescript
class SchemaEvolutionManager {
  async addColumn(
    table: string,
    column: string,
    type: string,
    defaultValue?: any
  ): Promise<void> {
    // Use transaction for safety
    await db.transaction(async (tx) => {
      // Add column with default
      await tx.query(`
        ALTER TABLE ${table} 
        ADD COLUMN ${column} ${type} 
        ${defaultValue !== undefined ? `DEFAULT ${defaultValue}` : ''}
      `);

      // Backfill existing rows if needed
      if (defaultValue !== undefined) {
        await tx.query(`
          UPDATE ${table} 
          SET ${column} = ${defaultValue}
          WHERE ${column} IS NULL
        `);
      }

      // Drop default if set (to avoid locking issues)
      if (defaultValue !== undefined) {
        await tx.query(`
          ALTER TABLE ${table} 
          ALTER COLUMN ${column} DROP DEFAULT
        `);
      }
    });
  }

  async safeRenameColumn(
    table: string,
    oldColumn: string,
    newColumn: string
  ): Promise<void> {
    // Create new column
    await this.addColumn(table, newColumn, await this.getColumnType(table, oldColumn));

    // Copy data
    await db.query(`
      UPDATE ${table} 
      SET ${newColumn} = ${oldColumn}
    `);

    // Drop old column (after verification period)
    await db.query(`
      ALTER TABLE ${table} 
      DROP COLUMN ${oldColumn}
    `);
  }

  async createMigration(migration: Migration): Promise<void> {
    const migrationRecord = {
      version: migration.version,
      name: migration.name,
      applied_at: new Date(),
      checksum: migration.checksum
    };

    await db.transaction(async (tx) => {
      // Run migration
      await migration.up(tx);

      // Record migration
      await tx.query(`
        INSERT INTO schema_migrations (version, name, applied_at, checksum)
        VALUES ($1, $2, $3, $4)
      `, [
        migrationRecord.version,
        migrationRecord.name,
        migrationRecord.applied_at,
        migrationRecord.checksum
      ]);
    });
  }
}
```

---

## Best Practices

### 1. Define Clear Grain Statements
```typescript
// ✅ Good: Clear grain definition
const grainStatement = `
Grain: One row per order line item, 
       representing a single product in a single order,
       captured at the time of order placement.
`;

// ❌ Bad: Unclear grain
const badGrain = "Order data";
```

### 2. Use Surrogate Keys
```typescript
// ✅ Good: Surrogate + natural key
interface DimCustomer {
  customer_key: number;    // Surrogate (PK)
  customer_id: string;     // Natural key (business key)
  // ...
}

// Create index on natural key
CREATE INDEX idx_dim_customer_natural ON dim_customer(customer_id);
```

### 3. Include Audit Columns
```typescript
// ✅ Good: Standard audit columns
const auditColumns = `
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by VARCHAR(100),
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_by VARCHAR(100),
  version INTEGER DEFAULT 1
`;
```

---

## Anti-Patterns

### ❌ Over-Normalization for Analytics
```typescript
// ❌ Bad: 15 joins to get simple report
SELECT ... FROM f
  JOIN d1 ON ...
  JOIN d2 ON ...
  JOIN d3 ON ...
  // ... 12 more joins

// ✅ Good: Star schema (4-5 joins max)
SELECT ... FROM fact_sales
  JOIN dim_date ON ...
  JOIN dim_product ON ...
  JOIN dim_customer ON ...
  JOIN dim_store ON ...
```

### ❌ No SCD Strategy
```typescript
// ❌ Bad: Overwriting history
UPDATE dim_customer SET city = 'New York' WHERE customer_id = 'C001';

// ✅ Good: Type 2 SCD
-- Expire old record
UPDATE dim_customer SET expiry_date = CURRENT_DATE, is_current = FALSE
WHERE customer_id = 'C001' AND is_current = TRUE;

-- Insert new record
INSERT INTO dim_customer (customer_id, city, effective_date, is_current)
VALUES ('C001', 'New York', CURRENT_DATE, TRUE);
```

---

## Metrics to Track

| Metric | Target | Why It Matters |
|--------|--------|----------------|
| **Query Performance** | <5s | User experience |
| **Schema Change Frequency** | Track | Stability |
| **Data Quality Score** | >95% | Trust |
| **Model Coverage** | 100% | Completeness |
| **Documentation Coverage** | 100% | Maintainability |

---

## Tools & Libraries

| Tool | Purpose | Best For |
|------|---------|----------|
| **dbt** | Data modeling | SQL-based transformations |
| **ER/Studio** | ER diagramming | Enterprise modeling |
| **SQLDBM** | Online modeling | Collaboration |
| **Great Expectations** | Data validation | Quality checks |

---

## Implementation Checklist

### Design
- [ ] Business requirements gathered
- [ ] Grain statements defined
- [ ] Dimensions identified
- [ ] Facts identified
- [ ] SCD types selected

### Implementation
- [ ] DDL scripts created
- [ ] Migrations versioned
- [ ] Indexes planned
- [ ] Constraints defined

### Documentation
- [ ] ER diagrams created
- [ ] Data dictionary complete
- [ ] Lineage documented
- [ ] Business glossary created

---

## Related Skills

- **Data Pipeline**: `skills/data/data-pipeline/data_pipeline_v1/SKILL.md`
- **PostgreSQL**: `skills/stack/postgresql/postgresql_advanced_skill_v1/SKILL.md`
- **Data Quality**: `skills/data/data-quality/data_quality_v1/SKILL.md`

---

**Version:** 1.0.0
**Last Updated:** March 29, 2026
**Status:** ✅ Complete
