CREATE TABLE "user_playback_history" (
	"user_id" uuid NOT NULL,
	"media_item_id" uuid NOT NULL,
	"played_on" date NOT NULL,
	"last_played_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_playback_history_user_id_media_item_id_played_on_pk" PRIMARY KEY("user_id","media_item_id","played_on")
);
--> statement-breakpoint
ALTER TABLE "user_playback_history" ADD CONSTRAINT "user_playback_history_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "user_playback_history" ADD CONSTRAINT "user_playback_history_media_item_id_media_items_id_fk" FOREIGN KEY ("media_item_id") REFERENCES "public"."media_items"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "user_playback_history_user_recent_idx" ON "user_playback_history" USING btree ("user_id","last_played_at" DESC);
--> statement-breakpoint
CREATE INDEX "user_playback_history_media_item_idx" ON "user_playback_history" USING btree ("media_item_id");
--> statement-breakpoint
ALTER TABLE "user_playback_history" ENABLE ROW LEVEL SECURITY;
