CREATE TABLE "canjes" (
	"id" serial PRIMARY KEY NOT NULL,
	"cliente_id" integer NOT NULL,
	"recompensa_id" integer NOT NULL,
	"puntos_gastados" integer NOT NULL,
	"estatus" varchar(20) DEFAULT 'pendiente' NOT NULL,
	"fecha_canje" timestamp with time zone DEFAULT now() NOT NULL,
	"fecha_entrega" timestamp with time zone,
	"motivo_cancelacion" text,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "clientes" (
	"id" integer PRIMARY KEY NOT NULL,
	"nombre" varchar(150) NOT NULL,
	"correo" varchar(150),
	"telefono" varchar(50),
	"dob" varchar(50),
	"fecha_nacimiento" varchar(10),
	"creado_en_fuente" timestamp with time zone,
	"puntos" integer DEFAULT 0 NOT NULL,
	"puntos_disponibles" integer DEFAULT 0 NOT NULL,
	"nivel" varchar(20) DEFAULT 'Bronce' NOT NULL,
	"gasto_12m" numeric(12, 2) DEFAULT '0.00' NOT NULL,
	"en_riesgo" boolean DEFAULT false NOT NULL,
	"dias_sin_actividad" integer,
	"fecha_cumpleanos" varchar(10),
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "corridas_sincronizacion" (
	"id" serial PRIMARY KEY NOT NULL,
	"tipo" varchar(20) NOT NULL,
	"iniciado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"finalizado_en" timestamp with time zone,
	"total_requests" integer DEFAULT 0 NOT NULL,
	"estatus" varchar(20) DEFAULT 'en_progreso' NOT NULL,
	"mensaje_error" text,
	"resumen" jsonb,
	"ejecutado_por_usuario_id" integer
);
--> statement-breakpoint
CREATE TABLE "cuentas_portal" (
	"cliente_id" integer PRIMARY KEY NOT NULL,
	"password_hash" text,
	"estado_acceso" varchar(30) DEFAULT 'sin_acceso' NOT NULL,
	"requiere_cambio_password" boolean DEFAULT true NOT NULL,
	"intentos_fallidos" integer DEFAULT 0 NOT NULL,
	"bloqueado_hasta" timestamp with time zone,
	"ultimo_acceso_en" timestamp with time zone,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cupones" (
	"id" serial PRIMARY KEY NOT NULL,
	"canje_id" integer NOT NULL,
	"cliente_id" integer NOT NULL,
	"codigo" varchar(30) NOT NULL,
	"descuento_tipo" varchar(20) NOT NULL,
	"descuento_valor" numeric(10, 2) NOT NULL,
	"compra_minima_mxn" numeric(10, 2),
	"fecha_vencimiento" timestamp with time zone NOT NULL,
	"estatus" varchar(20) DEFAULT 'vigente' NOT NULL,
	"usado_en" timestamp with time zone,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "cupones_canje_id_unique" UNIQUE("canje_id"),
	CONSTRAINT "cupones_codigo_unique" UNIQUE("codigo")
);
--> statement-breakpoint
CREATE TABLE "inconsistencias_fuente" (
	"id" serial PRIMARY KEY NOT NULL,
	"corrida_id" integer,
	"entidad" varchar(30) NOT NULL,
	"entidad_id" varchar(50) NOT NULL,
	"tipo_inconsistencia" varchar(80) NOT NULL,
	"descripcion" text NOT NULL,
	"datos_crudos" jsonb,
	"fecha_deteccion" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "movimientos_puntos" (
	"id" serial PRIMARY KEY NOT NULL,
	"cliente_id" integer NOT NULL,
	"fecha" varchar(10) NOT NULL,
	"tipo" varchar(40) NOT NULL,
	"referencia" varchar(60) NOT NULL,
	"puntos" integer NOT NULL,
	"origen" varchar(20) DEFAULT 'sync' NOT NULL,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pagos" (
	"id" integer PRIMARY KEY NOT NULL,
	"cliente_id" integer NOT NULL,
	"pedido_id" integer,
	"monto_original" numeric(12, 2) NOT NULL,
	"moneda" varchar(10) NOT NULL,
	"monto_mxn" numeric(12, 2) NOT NULL,
	"estatus" varchar(30) NOT NULL,
	"fecha_pago_utc" timestamp with time zone NOT NULL,
	"fecha_local" varchar(10) NOT NULL,
	"datos_crudos" jsonb
);
--> statement-breakpoint
CREATE TABLE "pedidos" (
	"id" integer PRIMARY KEY NOT NULL,
	"numero_orden" varchar(50),
	"cliente_id" integer NOT NULL,
	"estatus" varchar(30) NOT NULL,
	"estatus_pago" varchar(30) NOT NULL,
	"total" numeric(12, 2),
	"fecha_creacion_utc" timestamp with time zone NOT NULL,
	"fecha_local" varchar(10) NOT NULL,
	"datos_crudos" jsonb
);
--> statement-breakpoint
CREATE TABLE "recompensas" (
	"id" serial PRIMARY KEY NOT NULL,
	"tipo" varchar(20) NOT NULL,
	"nombre" varchar(150) NOT NULL,
	"descripcion" text,
	"foto_url" text,
	"puntos_requeridos" integer NOT NULL,
	"stock" integer,
	"nivel_minimo" varchar(20) DEFAULT 'Bronce' NOT NULL,
	"limite_por_cliente" integer,
	"activo" boolean DEFAULT true NOT NULL,
	"descuento_tipo" varchar(20),
	"descuento_valor" numeric(10, 2),
	"compra_minima_mxn" numeric(10, 2),
	"vigencia_dias" integer,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "roles" (
	"id" serial PRIMARY KEY NOT NULL,
	"nombre" varchar(50) NOT NULL,
	"descripcion" text,
	"es_sistema" boolean DEFAULT false NOT NULL,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "roles_nombre_unique" UNIQUE("nombre")
);
--> statement-breakpoint
CREATE TABLE "roles_permisos" (
	"id" serial PRIMARY KEY NOT NULL,
	"rol_id" integer NOT NULL,
	"permiso_clave" varchar(80) NOT NULL,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tokens_api" (
	"id" serial PRIMARY KEY NOT NULL,
	"nombre" varchar(100) NOT NULL,
	"token_hash" text NOT NULL,
	"creado_por_usuario_id" integer,
	"revocado" boolean DEFAULT false NOT NULL,
	"ultimo_uso_en" timestamp with time zone,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tokens_api_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "usuarios" (
	"id" serial PRIMARY KEY NOT NULL,
	"nombre" varchar(120) NOT NULL,
	"correo" varchar(150) NOT NULL,
	"password_hash" text NOT NULL,
	"rol_id" integer NOT NULL,
	"activo" boolean DEFAULT true NOT NULL,
	"intentos_fallidos" integer DEFAULT 0 NOT NULL,
	"bloqueado_hasta" timestamp with time zone,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "usuarios_correo_unique" UNIQUE("correo")
);
--> statement-breakpoint
ALTER TABLE "canjes" ADD CONSTRAINT "canjes_cliente_id_clientes_id_fk" FOREIGN KEY ("cliente_id") REFERENCES "public"."clientes"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "canjes" ADD CONSTRAINT "canjes_recompensa_id_recompensas_id_fk" FOREIGN KEY ("recompensa_id") REFERENCES "public"."recompensas"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "corridas_sincronizacion" ADD CONSTRAINT "corridas_sincronizacion_ejecutado_por_usuario_id_usuarios_id_fk" FOREIGN KEY ("ejecutado_por_usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cuentas_portal" ADD CONSTRAINT "cuentas_portal_cliente_id_clientes_id_fk" FOREIGN KEY ("cliente_id") REFERENCES "public"."clientes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cupones" ADD CONSTRAINT "cupones_canje_id_canjes_id_fk" FOREIGN KEY ("canje_id") REFERENCES "public"."canjes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cupones" ADD CONSTRAINT "cupones_cliente_id_clientes_id_fk" FOREIGN KEY ("cliente_id") REFERENCES "public"."clientes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inconsistencias_fuente" ADD CONSTRAINT "inconsistencias_fuente_corrida_id_corridas_sincronizacion_id_fk" FOREIGN KEY ("corrida_id") REFERENCES "public"."corridas_sincronizacion"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "movimientos_puntos" ADD CONSTRAINT "movimientos_puntos_cliente_id_clientes_id_fk" FOREIGN KEY ("cliente_id") REFERENCES "public"."clientes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pagos" ADD CONSTRAINT "pagos_cliente_id_clientes_id_fk" FOREIGN KEY ("cliente_id") REFERENCES "public"."clientes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pedidos" ADD CONSTRAINT "pedidos_cliente_id_clientes_id_fk" FOREIGN KEY ("cliente_id") REFERENCES "public"."clientes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "roles_permisos" ADD CONSTRAINT "roles_permisos_rol_id_roles_id_fk" FOREIGN KEY ("rol_id") REFERENCES "public"."roles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tokens_api" ADD CONSTRAINT "tokens_api_creado_por_usuario_id_usuarios_id_fk" FOREIGN KEY ("creado_por_usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_rol_id_roles_id_fk" FOREIGN KEY ("rol_id") REFERENCES "public"."roles"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_canjes_cliente" ON "canjes" USING btree ("cliente_id");--> statement-breakpoint
CREATE INDEX "idx_cupones_cliente" ON "cupones" USING btree ("cliente_id");--> statement-breakpoint
CREATE INDEX "idx_cupones_codigo" ON "cupones" USING btree ("codigo");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_movimiento_cliente_tipo_ref" ON "movimientos_puntos" USING btree ("cliente_id","tipo","referencia");--> statement-breakpoint
CREATE INDEX "idx_movimientos_cliente" ON "movimientos_puntos" USING btree ("cliente_id");--> statement-breakpoint
CREATE INDEX "idx_pagos_cliente" ON "pagos" USING btree ("cliente_id");--> statement-breakpoint
CREATE INDEX "idx_pagos_fecha_local" ON "pagos" USING btree ("fecha_local");--> statement-breakpoint
CREATE INDEX "idx_pedidos_cliente" ON "pedidos" USING btree ("cliente_id");--> statement-breakpoint
CREATE INDEX "idx_pedidos_fecha_local" ON "pedidos" USING btree ("fecha_local");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_rol_permiso" ON "roles_permisos" USING btree ("rol_id","permiso_clave");