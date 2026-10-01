import {defineConfig,devices} from '@playwright/test';

// Larguras exigidas para validar a vitrine: celulares, tablet, notebook e monitor.
const widths=[{name:'375',width:375,height:812,mobile:true},{name:'390',width:390,height:844,mobile:true},{name:'768',width:768,height:1024,mobile:true},{name:'1366',width:1366,height:768,mobile:false},{name:'1920',width:1920,height:1080,mobile:false}];
const baseURL=process.env.E2E_BASE_URL||'http://localhost:3000';

export default defineConfig({
 testDir:'./e2e',
 testMatch:'**/*.e2e.ts',
 fullyParallel:true,
 forbidOnly:!!process.env.CI,
 retries:process.env.CI?1:0,
 reporter:[['list'],['html',{open:'never',outputFolder:'playwright-report'}]],
 use:{baseURL,trace:'retain-on-failure',screenshot:'only-on-failure',locale:'pt-BR',timezoneId:'America/Bahia'},
 projects:widths.map(w=>({name:w.name,use:{...devices['Desktop Chrome'],viewport:{width:w.width,height:w.height},isMobile:w.mobile,hasTouch:w.mobile}})),
 webServer:process.env.E2E_BASE_URL?undefined:{command:process.env.E2E_SKIP_BUILD?'npm run start':'npm run build && npm run start',url:baseURL,reuseExistingServer:!process.env.CI,timeout:240_000},
});
