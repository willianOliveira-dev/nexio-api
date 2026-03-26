CREATE TYPE "public"."user_plan" AS ENUM('free', 'pro', 'enterprise');--> statement-breakpoint
CREATE TABLE "certifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"resume_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"issuer" varchar(255) NOT NULL,
	"issue_date" varchar(64),
	"expiration_date" varchar(64),
	"url" varchar(255),
	"order_index" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"resume_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text NOT NULL,
	"keywords" jsonb DEFAULT '[]'::jsonb,
	"url" varchar(255),
	"order_index" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "volunteering" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"resume_id" uuid NOT NULL,
	"role" varchar(255) NOT NULL,
	"organization" varchar(255) NOT NULL,
	"start_date" varchar(64),
	"end_date" varchar(64),
	"description" text,
	"order_index" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "chat_sessions" ADD COLUMN "job_match_id" uuid;--> statement-breakpoint
ALTER TABLE "user_profiles" ADD COLUMN "plan" "user_plan" DEFAULT 'free' NOT NULL;--> statement-breakpoint
ALTER TABLE "user_profiles" ADD COLUMN "ai_credits_used" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "certifications" ADD CONSTRAINT "certifications_resume_id_resumes_id_fk" FOREIGN KEY ("resume_id") REFERENCES "public"."resumes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_resume_id_resumes_id_fk" FOREIGN KEY ("resume_id") REFERENCES "public"."resumes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "volunteering" ADD CONSTRAINT "volunteering_resume_id_resumes_id_fk" FOREIGN KEY ("resume_id") REFERENCES "public"."resumes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "certifications_resume_id_idx" ON "certifications" USING btree ("resume_id");--> statement-breakpoint
CREATE INDEX "projects_resume_id_idx" ON "projects" USING btree ("resume_id");--> statement-breakpoint
CREATE INDEX "volunteering_resume_id_idx" ON "volunteering" USING btree ("resume_id");--> statement-breakpoint
ALTER TABLE "chat_sessions" ADD CONSTRAINT "chat_sessions_job_match_id_job_matches_id_fk" FOREIGN KEY ("job_match_id") REFERENCES "public"."job_matches"("id") ON DELETE set null ON UPDATE no action;