/**
 * Template Service - Provides structured templates for common tasks
 */

import { ExecutionPlan, PlanStep } from '@excel-ai-agent/shared';
import { v4 as uuidv4 } from 'uuid';

interface TemplateGeneratorContext {
  workbookName: string;
  activeSheet: string;
  activeSelection?: string;
  existingSheets: string[];
}

class TemplateService {
  /**
   * Generate a 3-statement financial model template
   */
  generate3StatementModel(context: TemplateGeneratorContext): ExecutionPlan {
    const planId = `plan_${uuidv4()}`;
    const steps: PlanStep[] = [];

    // Step 1: Create Inputs sheet
    steps.push({
      id: 'step_1',
      description: 'Create Inputs/Assumptions sheet',
      toolName: 'createSheet',
      args: { name: 'Inputs', position: 'beginning' },
      expectedEffect: 'New sheet "Inputs" created for assumptions and drivers',
      riskLevel: 'write',
      preconditions: [],
      postconditions: ['Sheet "Inputs" exists'],
    });

    // Step 2: Populate Inputs sheet
    steps.push({
      id: 'step_2',
      description: 'Populate Inputs sheet with assumptions',
      toolName: 'writeRange',
      args: {
        sheetName: 'Inputs',
        address: 'A1',
        values: [
          ['3-Statement Financial Model - Inputs'],
          [''],
          ['Revenue Assumptions'],
          ['Base Revenue', 1000000],
          ['Growth Rate', 0.1],
          [''],
          ['Cost Assumptions'],
          ['COGS %', 0.6],
          ['Operating Expenses', 200000],
          [''],
          ['Balance Sheet Assumptions'],
          ['Starting Cash', 500000],
          ['Accounts Receivable Days', 45],
          ['Inventory Days', 30],
          ['Accounts Payable Days', 30],
          [''],
          ['Tax Rate', 0.25],
        ],
      },
      expectedEffect: 'Input assumptions populated',
      riskLevel: 'write',
      preconditions: ['Sheet "Inputs" exists'],
      postconditions: ['Input values written'],
    });

    // Step 3: Format Inputs header
    steps.push({
      id: 'step_3',
      description: 'Format Inputs header',
      toolName: 'formatRange',
      args: {
        sheetName: 'Inputs',
        address: 'A1',
        format: { bold: true, fontSize: 14 },
      },
      expectedEffect: 'Header formatted',
      riskLevel: 'write',
      preconditions: [],
      postconditions: [],
    });

    // Step 4: Create Income Statement sheet
    steps.push({
      id: 'step_4',
      description: 'Create Income Statement sheet',
      toolName: 'createSheet',
      args: { name: 'Income Statement' },
      expectedEffect: 'New sheet "Income Statement" created',
      riskLevel: 'write',
      preconditions: [],
      postconditions: ['Sheet "Income Statement" exists'],
    });

    // Step 5: Populate Income Statement structure
    steps.push({
      id: 'step_5',
      description: 'Populate Income Statement structure',
      toolName: 'writeRange',
      args: {
        sheetName: 'Income Statement',
        address: 'A1',
        values: [
          ['Income Statement', 'Year 1', 'Year 2', 'Year 3'],
          [''],
          ['Revenue'],
          ['Cost of Goods Sold'],
          ['Gross Profit'],
          [''],
          ['Operating Expenses'],
          ['Operating Income (EBIT)'],
          [''],
          ['Interest Expense'],
          ['Pre-Tax Income'],
          [''],
          ['Income Tax'],
          ['Net Income'],
        ],
      },
      expectedEffect: 'Income Statement line items created',
      riskLevel: 'write',
      preconditions: ['Sheet "Income Statement" exists'],
      postconditions: [],
    });

    // Step 6: Add Income Statement formulas
    steps.push({
      id: 'step_6',
      description: 'Add Revenue formula linking to Inputs',
      toolName: 'setFormula',
      args: {
        sheetName: 'Income Statement',
        address: 'B3',
        formula: '=Inputs!$B$4',
      },
      expectedEffect: 'Revenue linked to Inputs',
      riskLevel: 'write',
      preconditions: [],
      postconditions: [],
    });

    steps.push({
      id: 'step_7',
      description: 'Add COGS formula',
      toolName: 'setFormula',
      args: {
        sheetName: 'Income Statement',
        address: 'B4',
        formula: '=B3*Inputs!$B$8',
      },
      expectedEffect: 'COGS calculated',
      riskLevel: 'write',
      preconditions: [],
      postconditions: [],
    });

    steps.push({
      id: 'step_8',
      description: 'Add Gross Profit formula',
      toolName: 'setFormula',
      args: {
        sheetName: 'Income Statement',
        address: 'B5',
        formula: '=B3-B4',
      },
      expectedEffect: 'Gross Profit calculated',
      riskLevel: 'write',
      preconditions: [],
      postconditions: [],
    });

    // Step 9: Create Balance Sheet
    steps.push({
      id: 'step_9',
      description: 'Create Balance Sheet',
      toolName: 'createSheet',
      args: { name: 'Balance Sheet' },
      expectedEffect: 'New sheet "Balance Sheet" created',
      riskLevel: 'write',
      preconditions: [],
      postconditions: ['Sheet "Balance Sheet" exists'],
    });

    // Step 10: Populate Balance Sheet structure
    steps.push({
      id: 'step_10',
      description: 'Populate Balance Sheet structure',
      toolName: 'writeRange',
      args: {
        sheetName: 'Balance Sheet',
        address: 'A1',
        values: [
          ['Balance Sheet', 'Year 1', 'Year 2', 'Year 3'],
          [''],
          ['Assets'],
          ['Cash'],
          ['Accounts Receivable'],
          ['Inventory'],
          ['Total Current Assets'],
          [''],
          ['Fixed Assets'],
          ['Total Assets'],
          [''],
          ['Liabilities'],
          ['Accounts Payable'],
          ['Total Current Liabilities'],
          [''],
          ['Long-term Debt'],
          ['Total Liabilities'],
          [''],
          ['Equity'],
          ['Retained Earnings'],
          ['Total Equity'],
          [''],
          ['Total Liabilities + Equity'],
        ],
      },
      expectedEffect: 'Balance Sheet line items created',
      riskLevel: 'write',
      preconditions: ['Sheet "Balance Sheet" exists'],
      postconditions: [],
    });

    // Step 11: Create Cash Flow Statement
    steps.push({
      id: 'step_11',
      description: 'Create Cash Flow Statement',
      toolName: 'createSheet',
      args: { name: 'Cash Flow' },
      expectedEffect: 'New sheet "Cash Flow" created',
      riskLevel: 'write',
      preconditions: [],
      postconditions: ['Sheet "Cash Flow" exists'],
    });

    // Step 12: Populate Cash Flow structure
    steps.push({
      id: 'step_12',
      description: 'Populate Cash Flow structure',
      toolName: 'writeRange',
      args: {
        sheetName: 'Cash Flow',
        address: 'A1',
        values: [
          ['Cash Flow Statement', 'Year 1', 'Year 2', 'Year 3'],
          [''],
          ['Operating Activities'],
          ['Net Income'],
          ['Changes in Working Capital'],
          ['Cash from Operations'],
          [''],
          ['Investing Activities'],
          ['Capital Expenditures'],
          ['Cash from Investing'],
          [''],
          ['Financing Activities'],
          ['Debt Proceeds/(Payments)'],
          ['Cash from Financing'],
          [''],
          ['Net Change in Cash'],
          ['Beginning Cash'],
          ['Ending Cash'],
        ],
      },
      expectedEffect: 'Cash Flow line items created',
      riskLevel: 'write',
      preconditions: ['Sheet "Cash Flow" exists'],
      postconditions: [],
    });

    // Step 13: Format all headers
    steps.push({
      id: 'step_13',
      description: 'Format Income Statement header',
      toolName: 'formatRange',
      args: {
        sheetName: 'Income Statement',
        address: 'A1:D1',
        format: { bold: true, fontSize: 12, backgroundColor: '#E8F4FD' },
      },
      expectedEffect: 'Headers formatted',
      riskLevel: 'write',
      preconditions: [],
      postconditions: [],
    });

    return {
      id: planId,
      createdAt: Date.now(),
      description: 'Create a 3-statement financial model with Inputs, Income Statement, Balance Sheet, and Cash Flow sheets',
      steps,
      estimatedTokens: 2000,
      estimatedCost: 0.09,
    };
  }

  /**
   * Generate a PE Customer Cube template
   */
  generatePECustomerCube(context: TemplateGeneratorContext): ExecutionPlan {
    const planId = `plan_${uuidv4()}`;
    const steps: PlanStep[] = [];

    // Step 1: Create Data sheet
    steps.push({
      id: 'step_1',
      description: 'Create Customer Data sheet',
      toolName: 'createSheet',
      args: { name: 'Customer Data', position: 'beginning' },
      expectedEffect: 'New sheet "Customer Data" created',
      riskLevel: 'write',
      preconditions: [],
      postconditions: ['Sheet "Customer Data" exists'],
    });

    // Step 2: Populate sample customer data
    steps.push({
      id: 'step_2',
      description: 'Populate sample customer data',
      toolName: 'writeRange',
      args: {
        sheetName: 'Customer Data',
        address: 'A1',
        values: [
          ['Customer ID', 'Customer Name', 'Segment', 'Region', 'Industry', 'Revenue', 'Contract Value', 'Start Date', 'End Date', 'Status'],
          ['C001', 'Acme Corp', 'Enterprise', 'North America', 'Manufacturing', 5000000, 250000, '2023-01-01', '2025-12-31', 'Active'],
          ['C002', 'Beta Inc', 'Mid-Market', 'Europe', 'Technology', 2500000, 125000, '2023-03-15', '2024-03-14', 'Active'],
          ['C003', 'Gamma LLC', 'Enterprise', 'North America', 'Healthcare', 8000000, 400000, '2022-06-01', '2025-05-31', 'Active'],
          ['C004', 'Delta Co', 'SMB', 'APAC', 'Retail', 500000, 25000, '2023-09-01', '2024-08-31', 'Active'],
          ['C005', 'Epsilon Ltd', 'Mid-Market', 'Europe', 'Financial Services', 3000000, 150000, '2023-01-01', '2024-12-31', 'Active'],
          ['C006', 'Zeta Corp', 'Enterprise', 'North America', 'Technology', 10000000, 500000, '2022-01-01', '2024-12-31', 'Churned'],
          ['C007', 'Eta Inc', 'SMB', 'North America', 'Manufacturing', 750000, 37500, '2023-06-01', '2024-05-31', 'Active'],
          ['C008', 'Theta LLC', 'Mid-Market', 'APAC', 'Healthcare', 1800000, 90000, '2023-04-01', '2025-03-31', 'Active'],
          ['C009', 'Iota Partners', 'Enterprise', 'Europe', 'Financial Services', 6000000, 300000, '2022-09-01', '2025-08-31', 'Active'],
          ['C010', 'Kappa Ltd', 'SMB', 'North America', 'Retail', 400000, 20000, '2023-11-01', '2024-10-31', 'At Risk'],
        ],
      },
      expectedEffect: 'Sample customer data populated',
      riskLevel: 'write',
      preconditions: ['Sheet "Customer Data" exists'],
      postconditions: [],
    });

    // Step 3: Create table from data
    steps.push({
      id: 'step_3',
      description: 'Convert data to table',
      toolName: 'ensureTable',
      args: {
        sheetName: 'Customer Data',
        addressOrUsedRange: 'usedRange',
        tableName: 'CustomerTable',
        hasHeaders: true,
      },
      expectedEffect: 'Data converted to Excel table for easier analysis',
      riskLevel: 'write',
      preconditions: [],
      postconditions: ['Table "CustomerTable" exists'],
    });

    // Step 4: Create Segment Analysis sheet
    steps.push({
      id: 'step_4',
      description: 'Create Segment Analysis pivot sheet',
      toolName: 'createSheet',
      args: { name: 'Segment Analysis' },
      expectedEffect: 'New sheet "Segment Analysis" created',
      riskLevel: 'write',
      preconditions: [],
      postconditions: [],
    });

    // Step 5: Create pivot by segment
    steps.push({
      id: 'step_5',
      description: 'Create pivot table by Segment',
      toolName: 'createPivotTable',
      args: {
        pivotName: 'SegmentPivot',
        sourceAddressOrTable: 'CustomerTable',
        destinationSheet: 'Segment Analysis',
        destinationCell: 'A3',
        rows: ['Segment'],
        values: [
          { field: 'Revenue', summarizeBy: 'sum', name: 'Total Revenue' },
          { field: 'Contract Value', summarizeBy: 'sum', name: 'Total Contract Value' },
          { field: 'Customer ID', summarizeBy: 'count', name: 'Customer Count' },
        ],
      },
      expectedEffect: 'Pivot table showing revenue by segment',
      riskLevel: 'write',
      preconditions: ['Table "CustomerTable" exists'],
      postconditions: [],
    });

    // Step 6: Create Region Analysis sheet
    steps.push({
      id: 'step_6',
      description: 'Create Region Analysis pivot sheet',
      toolName: 'createSheet',
      args: { name: 'Region Analysis' },
      expectedEffect: 'New sheet "Region Analysis" created',
      riskLevel: 'write',
      preconditions: [],
      postconditions: [],
    });

    // Step 7: Create pivot by region
    steps.push({
      id: 'step_7',
      description: 'Create pivot table by Region',
      toolName: 'createPivotTable',
      args: {
        pivotName: 'RegionPivot',
        sourceAddressOrTable: 'CustomerTable',
        destinationSheet: 'Region Analysis',
        destinationCell: 'A3',
        rows: ['Region'],
        columns: ['Industry'],
        values: [
          { field: 'Revenue', summarizeBy: 'sum', name: 'Revenue' },
        ],
      },
      expectedEffect: 'Pivot table showing revenue by region and industry',
      riskLevel: 'write',
      preconditions: [],
      postconditions: [],
    });

    // Step 8: Add summary chart
    steps.push({
      id: 'step_8',
      description: 'Create summary chart',
      toolName: 'createChart',
      args: {
        sheetName: 'Customer Data',
        sourceAddress: 'C1:C11,F1:F11',
        chartType: 'barClustered',
        title: 'Revenue by Segment',
        width: 500,
        height: 300,
      },
      expectedEffect: 'Bar chart showing revenue distribution',
      riskLevel: 'write',
      preconditions: [],
      postconditions: [],
    });

    // Step 9: Format headers
    steps.push({
      id: 'step_9',
      description: 'Format Customer Data headers',
      toolName: 'formatRange',
      args: {
        sheetName: 'Customer Data',
        address: 'A1:J1',
        format: { bold: true, backgroundColor: '#4472C4', fontColor: '#FFFFFF' },
      },
      expectedEffect: 'Headers formatted with blue background',
      riskLevel: 'write',
      preconditions: [],
      postconditions: [],
    });

    return {
      id: planId,
      createdAt: Date.now(),
      description: 'Create a PE Customer Cube with normalized customer data, segment analysis, region analysis, and summary visualizations',
      steps,
      estimatedTokens: 1500,
      estimatedCost: 0.07,
    };
  }

  /**
   * Generate a simple chart plan
   */
  generateChartPlan(
    sheetName: string,
    sourceAddress: string,
    chartType: string = 'columnClustered',
    title?: string
  ): ExecutionPlan {
    const planId = `plan_${uuidv4()}`;

    return {
      id: planId,
      createdAt: Date.now(),
      description: `Create a ${chartType} chart from ${sourceAddress}`,
      steps: [
        {
          id: 'step_1',
          description: `Create ${chartType} chart`,
          toolName: 'createChart',
          args: {
            sheetName,
            sourceAddress,
            chartType,
            title: title || `Chart of ${sourceAddress}`,
            width: 500,
            height: 300,
          },
          expectedEffect: `New chart created from ${sourceAddress}`,
          riskLevel: 'write',
          preconditions: [`Data exists at ${sourceAddress}`],
          postconditions: ['Chart created'],
        },
      ],
      estimatedTokens: 500,
      estimatedCost: 0.02,
    };
  }

  /**
   * Generate a pivot table plan
   */
  generatePivotPlan(
    sheetName: string,
    sourceAddress: string,
    pivotName?: string
  ): ExecutionPlan {
    const planId = `plan_${uuidv4()}`;
    const name = pivotName || `Pivot_${Date.now()}`;

    return {
      id: planId,
      createdAt: Date.now(),
      description: `Create a pivot table from ${sourceAddress}`,
      steps: [
        {
          id: 'step_1',
          description: 'Create table from source data',
          toolName: 'ensureTable',
          args: {
            sheetName,
            addressOrUsedRange: sourceAddress,
            tableName: `${name}_Source`,
            hasHeaders: true,
          },
          expectedEffect: 'Source data converted to table',
          riskLevel: 'write',
          preconditions: [],
          postconditions: [],
        },
        {
          id: 'step_2',
          description: 'Create destination sheet for pivot',
          toolName: 'createSheet',
          args: {
            name: `${name}_View`,
          },
          expectedEffect: 'New sheet created for pivot table',
          riskLevel: 'write',
          preconditions: [],
          postconditions: [],
        },
        {
          id: 'step_3',
          description: 'Create pivot table',
          toolName: 'createPivotTable',
          args: {
            pivotName: name,
            sourceAddressOrTable: `${name}_Source`,
            destinationSheet: `${name}_View`,
            destinationCell: 'A3',
          },
          expectedEffect: 'Pivot table created',
          riskLevel: 'write',
          preconditions: [],
          postconditions: [],
        },
      ],
      estimatedTokens: 800,
      estimatedCost: 0.04,
    };
  }
}

export const templateService = new TemplateService();
