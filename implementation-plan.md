# Implementation Plan

## Phase 0 — Foundation

### Objectives

- Establish namespaces.
- Compile persistent classes.
- Create role and table security model.
- Confirm coding standards.
- Load seed data.

### Namespaces

```text
HSREGISTRY
  MEF source-of-truth storage and eligibility cohort records

HSOUTREACH
  Campaigns, Twilio, scheduling, dispatch, billing, reporting

HSAUDIT
  Audit event persistence and audit search
```

## Phase 1 — Twilio Configuration

### User Capabilities

- Configure Twilio account and messaging service.
- Set callback URLs.
- Enable test/live mode.
- Configure retry policy.
- Send test SMS.

### Engineering Tasks

- Build `HSOUTREACH.Admin.TwilioConfiguration`.
- Build `HSOUTREACH.SMS.ISmsProvider` contract.
- Build `HSOUTREACH.SMS.TwilioProvider` implementation.
- Add masked credential display.
- Add status callback endpoint.
- Add inbound STOP handling endpoint.

## Phase 2 — MEF Intake

### User Capabilities

- Load weekly NYeC MEF.
- Validate file.
- Review import summary.
- Activate MEF version for campaign use.

### Engineering Tasks

- Build MEF staging/import service.
- Normalize phone numbers.
- Hash file contents.
- Version each import.
- Mark duplicate rows and invalid rows.
- Store records as `HSREGISTRY.MEF.MefRecord`.

## Phase 3 — Campaign Management

### User Capabilities

- Create outreach campaign.
- Select MEF batch.
- Define customer SMS message.
- Configure daily cap and schedule.
- Launch, pause, resume, complete.

### Engineering Tasks

- Build `OutreachCampaign`, `CampaignBatch`, `OutreachRecipient`.
- Implement campaign lifecycle service.
- Validate status transitions.
- Add approval gate if customer requires it.

## Phase 4 — Scheduler and Dispatch

### User Capabilities

- Campaign automatically starts sending at 9:00 AM Monday–Friday.
- Daily cap is honored.
- Remaining recipients roll forward to the next business day.

### Engineering Tasks

- Implement `SchedulerService.RunDueCampaigns()`.
- Implement `CampaignService.BuildDailyBatch()`.
- Implement `DispatchService.QueueBatchMessages()`.
- Implement opt-out and duplicate suppression.
- Implement retry queue.

## Phase 5 — Command Center

### User Capabilities

- View operational status.
- See active campaigns.
- See today's queue.
- See Twilio health.
- See failures/retries.
- See costs and billable usage.

### Engineering Tasks

- Implement dashboard API.
- Implement metrics aggregation query/views.
- Connect Vue UI dashboard.

## Phase 6 — Billing and Reporting

### User Capabilities

- View billable patients/messages.
- View Twilio pass-through costs.
- Preview monthly invoice.
- Export usage detail.

### Engineering Tasks

- Implement `Billing.UsageEvent`.
- Write events on `SMS_SENT`, `SMS_DELIVERED`, `SMS_FAILED`, `CAMPAIGN_ACTIVE_MONTHLY`.
- Add cost summary endpoint.

## Phase 7 — Testing and Go-Live

### Required Tests

- MEF import valid file.
- MEF import duplicate file.
- Campaign creates from MEF.
- Scheduler honors 9 AM weekday start.
- Scheduler does not run weekends.
- Daily limit is never exceeded.
- Opted-out phone is suppressed.
- Retry stops after max attempt.
- Audit is written for config/campaign/dispatch actions.
- Billing events reconcile to messages.
