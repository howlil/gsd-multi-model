import * as path from 'path';
import * as fs from 'fs';
import { FunnelAnalyzer } from '../../bin/lib/analytics/funnel-analyzer.js';

describe('FunnelAnalyzer', () => {
  let tmpDir: string;
  let analyzer: FunnelAnalyzer;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(process.cwd(), 'test-'));
    analyzer = new FunnelAnalyzer(tmpDir);
  });

  afterEach(() => {
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  test('constructor does not throw', () => {
    expect(analyzer).toBeTruthy();
  });

  test('defineFunnel() creates funnel with ordered steps', async () => {
    // Arrange
    const funnel = {
      name: 'signup',
      steps: [
        { name: 'form_submit', order: 2 },
        { name: 'page_view', order: 1 },
        { name: 'confirmation', order: 3 }
      ]
    };

    // Act
    await analyzer.defineFunnel(funnel);

    // Assert
    const dataPath = path.join(tmpDir, '.planning', 'funnels.json');
    expect(fs.existsSync(dataPath)).toBeTruthy();

    const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
    expect(data.funnels.length).toBe(1);
    expect(data.funnels[0].name).toBe('signup');
    
    // Steps should be sorted by order
    expect(data.funnels[0].steps[0].name).toBe('page_view');
    expect(data.funnels[0].steps[1].name).toBe('form_submit');
    expect(data.funnels[0].steps[2].name).toBe('confirmation');
  });

  test('trackConversion() records user progression through funnel', async () => {
    // Arrange
    await analyzer.defineFunnel({
      name: 'signup',
      steps: [
        { name: 'page_view', order: 1 },
        { name: 'form_submit', order: 2 }
      ]
    });

    // Act
    await analyzer.trackConversion('signup', 'user-123', ['page_view', 'form_submit']);

    // Assert
    const dataPath = path.join(tmpDir, '.planning', 'funnels.json');
    const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
    
    expect(data.conversions['signup']).toBeTruthy();
    expect(data.conversions['signup'].length).toBe(1);
    
    const conversion = data.conversions['signup'][0];
    expect(conversion.userId).toBe('user-123');
    expect(conversion.steps).toEqual(['page_view', 'form_submit']);
    expect(conversion.timestamp).toBeTruthy();
  });

  test('getConversionRates() returns percentage at each step', async () => {
    // Arrange: 10 users view, 5 click, 2 submit
    await analyzer.defineFunnel({
      name: 'signup',
      steps: [
        { name: 'page_view', order: 1 },
        { name: 'signup_click', order: 2 },
        { name: 'form_submit', order: 3 }
      ]
    });

    // 10 users view page
    for (let i = 0; i < 10; i++) {
      await analyzer.trackConversion('signup', `user-${i}`, ['page_view']);
    }
    // 5 users click
    for (let i = 0; i < 5; i++) {
      await analyzer.trackConversion('signup', `user-${i}`, ['page_view', 'signup_click']);
    }
    // 2 users submit
    for (let i = 0; i < 2; i++) {
      await analyzer.trackConversion('signup', `user-${i}`, ['page_view', 'signup_click', 'form_submit']);
    }

    // Act
    const rates = await analyzer.getConversionRates('signup');

    // Assert
    expect(rates).toBeTruthy();
    expect(rates.funnel).toBe('signup');
    expect(rates.steps).toBeTruthy();
    expect(rates.steps.length).toBe(3);
    
    expect(rates.steps[0]?.name).toBe('page_view');
    expect(rates.steps[0]?.users).toBe(10);
    expect(rates.steps[0]?.rate).toBe(100);
    
    expect(rates.steps[1]?.name).toBe('signup_click');
    expect(rates.steps[1]?.users).toBe(5);
    expect(rates.steps[1]?.rate).toBe(50);
    
    expect(rates.steps[2]?.name).toBe('form_submit');
    expect(rates.steps[2]?.users).toBe(2);
    expect(rates.steps[2]?.rate).toBe(20);
  });

  test('getDropOffPoints() identifies biggest conversion losses', async () => {
    // Arrange: 100 view, 30 click
    await analyzer.defineFunnel({
      name: 'checkout',
      steps: [
        { name: 'view_cart', order: 1 },
        { name: 'click_checkout', order: 2 }
      ]
    });

    for (let i = 0; i < 100; i++) {
      await analyzer.trackConversion('checkout', `user-${i}`, ['view_cart']);
    }
    for (let i = 0; i < 30; i++) {
      await analyzer.trackConversion('checkout', `user-${i}`, ['view_cart', 'click_checkout']);
    }

    // Act
    const dropOff = await analyzer.getDropOffPoints('checkout');

    // Assert
    expect(dropOff).toBeTruthy();
    expect(dropOff.totalUsers).toBe(100);
    expect(dropOff.points).toBeTruthy();
    expect(dropOff.points.length).toBeGreaterThan(0);
    expect(dropOff.points[0]?.fromStep).toBe('view_cart');
    expect(dropOff.points[0]?.toStep).toBe('click_checkout');
    expect(dropOff.points[0]?.dropRate).toBe(70);
  });

  test('compareFunnels() returns comparative metrics between funnels', async () => {
    // Arrange
    await analyzer.defineFunnel({
      name: 'funnel_a',
      steps: [
        { name: 'step1', order: 1 },
        { name: 'step2', order: 2 }
      ]
    });
    await analyzer.defineFunnel({
      name: 'funnel_b',
      steps: [
        { name: 'step1', order: 1 },
        { name: 'step2', order: 2 }
      ]
    });

    // Funnel A: 10 users, 5 complete
    for (let i = 0; i < 10; i++) {
      await analyzer.trackConversion('funnel_a', `user-${i}`, ['step1']);
    }
    for (let i = 0; i < 5; i++) {
      await analyzer.trackConversion('funnel_a', `user-${i}`, ['step1', 'step2']);
    }

    // Funnel B: 20 users, 10 complete
    for (let i = 0; i < 20; i++) {
      await analyzer.trackConversion('funnel_b', `user-${i}`, ['step1']);
    }
    for (let i = 0; i < 10; i++) {
      await analyzer.trackConversion('funnel_b', `user-${i}`, ['step1', 'step2']);
    }

    // Act
    const comparison = await analyzer.compareFunnels(['funnel_a', 'funnel_b']);

    // Assert
    expect(comparison).toBeTruthy();
    expect(comparison['funnel_a']).toBeTruthy();
    expect(comparison['funnel_b']).toBeTruthy();
    
    expect(comparison['funnel_a'].totalUsers).toBe(10);
    expect(comparison['funnel_a'].conversionRate).toBe(50);
    
    expect(comparison['funnel_b'].totalUsers).toBe(20);
    expect(comparison['funnel_b'].conversionRate).toBe(50);
  });
});
