/**
 * case-examples-loader.js - Dynamic Loader for Embeding Case Use Examples
 *
 * Provides on-demand asynchronous loading of state.json and query.json
 * from the case-use-examples/ catalog across all 10 use cases (150 examples).
 */

export const CASE_EXAMPLES_MANIFEST = {
    "banking_confidence": [
        "banking_confidence_01_aprobacion_de_transferencia_clara_alta_confia",
        "banking_confidence_02_comando_ambiguo_de_transferencia_confianza_mo",
        "banking_confidence_03_consulta_de_saldo_inofensiva_bajo_riesgo",
        "banking_confidence_04_comando_fuera_de_dominio_incertidumbre_alta_r",
        "banking_confidence_05_transferencia_masiva_de_alto_importe_15_000_c",
        "banking_confidence_06_consulta_de_ultimos_movimientos_y_compras_rec",
        "banking_confidence_07_orden_de_bloqueo_inmediato_de_tarjeta_por_per",
        "banking_confidence_08_pregunta_confusa_con_balbuceos_y_ruido_de_fon",
        "banking_confidence_09_transferencia_entre_cuentas_propias_corriente",
        "banking_confidence_10_consulta_de_tipo_de_interes_y_cuota_de_hipote",
        "banking_confidence_11_confirmacion_explicita_con_codigo_sms_de_6_di",
        "banking_confidence_12_solicitud_de_aumento_de_limite_de_credito_de_",
        "banking_confidence_13_frase_ininteligible_o_murmullo_sin_intencion_",
        "banking_confidence_14_pago_recurrente_de_suscripcion_de_streaming",
        "banking_confidence_15_reclamacion_y_disputa_de_comision_no_reconoci"
    ],
    "composite_resume": [
        "composite_resume_16_sasha_bernoulli_product_engineer",
        "composite_resume_01_staff_architect_senior_ic_experto_python_arqu",
        "composite_resume_02_engineering_manager_generalista_liderazgo_de_",
        "composite_resume_03_backend_developer_junior_fastapi_django_1_ano",
        "composite_resume_04_principal_infrastructure_sre_kubernetes_multi",
        "composite_resume_05_lead_software_architect_high_scale_microservi",
        "composite_resume_06_tech_lead_con_foco_equilibrado_50_lider_50_ic",
        "composite_resume_07_desarrollador_polyglota_full_stack_python_typ",
        "composite_resume_08_data_engineer_senior_pyspark_pipelines_etl_ai",
        "composite_resume_09_director_de_ingenieria_gestion_de_multiples_m",
        "composite_resume_10_especialista_en_optimizacion_y_rendimiento_c_",
        "composite_resume_11_desarrollador_mid_level_backend_3_anos_apis_r",
        "composite_resume_12_fundador_tecnico_cto_de_startup_wore_many_hat",
        "composite_resume_13_ingeniero_de_qa_automation_selenium_pytest_ci",
        "composite_resume_14_investigador_de_ia_machine_learning_pytorch_p",
        "composite_resume_15_consultor_de_software_freelance_multiples_cli"
    ],
    "content_moderation": [
        "content_moderation_01_doxxing_y_amenaza_explicita_de_violencia_fisi",
        "content_moderation_02_discusion_politica_apasionada_pero_respetuosa",
        "content_moderation_03_difusion_no_consentida_de_telefono_y_datos_de",
        "content_moderation_04_spam_masivo_de_bot_promocionando_phishing_ban",
        "content_moderation_05_receta_culinaria_casera_con_consejos_de_cocin",
        "content_moderation_06_mensaje_de_ideacion_suicida_y_desesperacion_e",
        "content_moderation_07_expresion_vulgar_de_frustracion_en_videojuego",
        "content_moderation_08_critica_cinematografica_negativa_pero_constru",
        "content_moderation_09_venta_clandestina_de_farmacos_sujetos_a_presc",
        "content_moderation_10_publicacion_cientifica_sobre_mitigacion_del_c",
        "content_moderation_11_discurso_de_odio_deshumanizante_contra_colect",
        "content_moderation_12_felicitacion_familiar_y_mensaje_afectivo_de_c",
        "content_moderation_13_comentario_con_ironia_benigna_entre_amigos_de",
        "content_moderation_14_estafa_de_rendimiento_financiero_fraudulento_",
        "content_moderation_15_pregunta_tecnica_sobre_desarrollo_web_en_stac"
    ],
    "financial_crime": [
        "financial_crime_01_transacciones_fraccionadas_de_9_950_en_48h_st",
        "financial_crime_02_pago_ordinario_de_nomina_empresarial_mensual_",
        "financial_crime_03_transferencia_a_jurisdiccion_de_alto_riesgo_s",
        "financial_crime_04_compra_habitual_de_supermercado_con_tarjeta_c",
        "financial_crime_05_cuenta_personal_recibiendo_50_micro_cobros_p2",
        "financial_crime_06_retiro_hacia_exchange_cripto_sin_kyc_con_serv",
        "financial_crime_07_donacion_benefica_a_ong_registrada_con_justif",
        "financial_crime_08_persona_politicamente_expuesta_pep_con_fondo_",
        "financial_crime_09_aumento_subito_10x_de_facturacion_en_negocio_",
        "financial_crime_10_compra_documentada_de_maquinaria_industrial_c",
        "financial_crime_11_tarjeta_clonada_retiros_fisicos_en_2_paises_s",
        "financial_crime_12_apertura_de_cuenta_con_pasaporte_de_calidad_c",
        "financial_crime_13_reparto_de_dividendos_legal_aprobado_en_junta",
        "financial_crime_14_cuenta_durmiente_reactivada_tras_6_anos_con_f",
        "financial_crime_15_domiciliacion_de_factura_electrica_domestica"
    ],
    "insurance_claims": [
        "insurance_claims_01_rotura_de_luna_parabrisas_con_fotos_stp_direc",
        "insurance_claims_02_siniestro_total_con_colision_multiple_y_hospi",
        "insurance_claims_03_declaracion_de_robo_de_joyas_sin_facturas_ni_",
        "insurance_claims_04_danos_por_agua_en_cocina_con_informe_de_fonta",
        "insurance_claims_05_golpe_leve_de_aparcamiento_con_parte_amistoso",
        "insurance_claims_06_incendio_en_local_comercial_con_poliza_contra",
        "insurance_claims_07_perdida_de_equipaje_en_vuelo_con_justificante",
        "insurance_claims_08_danos_electricos_por_tormenta_con_informe_tec",
        "insurance_claims_09_lesiones_cervicales_dudosas_sin_parte_medico_",
        "insurance_claims_10_perdida_de_llaves_de_vivienda_y_cambio_de_cer",
        "insurance_claims_11_multiples_siniestros_declarados_en_corto_plaz",
        "insurance_claims_12_danos_esteticos_en_parque_tras_fuga_de_lavado",
        "insurance_claims_13_robo_en_vivienda_con_allanamiento_y_denuncia_",
        "insurance_claims_14_caida_de_rama_de_arbol_sobre_techo_de_vehicul",
        "insurance_claims_15_reclamacion_sin_datos_del_contrario_ni_testig"
    ],
    "legal_compliance": [
        "legal_compliance_01_clausula_de_indemnizacion_y_responsabilidad_i",
        "legal_compliance_02_acuerdo_de_confidencialidad_bilateral_estanda",
        "legal_compliance_03_contrato_de_proveedor_sin_clausula_de_tratami",
        "legal_compliance_04_cesion_de_propiedad_intelectual_sin_exclusivi",
        "legal_compliance_05_clausula_de_no_competencia_que_excede_limites",
        "legal_compliance_06_addendum_de_proteccion_de_datos_dpa_conforme_",
        "legal_compliance_07_arrendamiento_comercial_con_prorroga_automati",
        "legal_compliance_08_renuncia_ilicita_de_derechos_fundamentales_de",
        "legal_compliance_09_periodo_de_prueba_laboral_que_duplica_el_conv",
        "legal_compliance_10_contrato_de_servicio_saas_con_compromiso_sla_",
        "legal_compliance_11_rescision_unilateral_sin_causa_justa_ni_preav",
        "legal_compliance_12_declaracion_de_conformidad_europea_marcado_ce",
        "legal_compliance_13_clausula_de_venta_conjunta_forzosa_drag_along",
        "legal_compliance_14_distribucion_comercial_exclusiva_con_objetivo",
        "legal_compliance_15_renuncia_previa_a_reclamaciones_por_vicios_oc"
    ],
    "llm_guardrails": [
        "llm_guardrails_16_dan_mode_jailbreak_policy_violation",
        "llm_guardrails_01_intento_de_jailbreak_prompt_injection_dan_mod",
        "llm_guardrails_02_prompt_tecnico_legitimo_configuracion_nginx",
        "llm_guardrails_03_mensaje_altamente_toxico_y_ofensivo",
        "llm_guardrails_04_extraccion_encubierta_de_variables_de_entorno",
        "llm_guardrails_05_inyeccion_indirecta_via_documento_markdown_ex",
        "llm_guardrails_06_redaccion_benigna_de_correo_de_felicitacion_c",
        "llm_guardrails_07_peticion_de_script_malicioso_para_desactivar_",
        "llm_guardrails_08_consulta_academica_de_fisica_y_mecanica_cuant",
        "llm_guardrails_09_evasion_de_filtro_mediante_texto_codificado_e",
        "llm_guardrails_10_comentario_con_sarcasmo_suave_pero_sin_hostil",
        "llm_guardrails_11_solicitud_de_extraccion_de_datos_personales_d",
        "llm_guardrails_12_planificacion_benigna_de_itinerario_de_viaje_",
        "llm_guardrails_13_tecnica_abuelita_cuento_para_evadir_filtros_d",
        "llm_guardrails_14_pregunta_de_ciberseguridad_defensiva_sanitiza",
        "llm_guardrails_15_manipulacion_psicologica_de_emergencia_falsa"
    ],
    "robot_telemetry": [
        "robot_telemetry_01_pasillo_frontal_obstruido_a_0_55m_parada_inme",
        "robot_telemetry_02_pasillo_despejado_con_bateria_alta_85_avanzar",
        "robot_telemetry_03_obstaculo_lateral_a_2_85m_bateria_nominal_54",
        "robot_telemetry_04_bateria_baja_al_18_obstaculo_a_1_80m_retorno_",
        "robot_telemetry_05_alerta_de_colision_inminente_a_0_40m_bateria_",
        "robot_telemetry_06_orientacion_hacia_este_con_rumbo_28_5_giro_iz",
        "robot_telemetry_07_rumbo_perfectamente_alineado_0_0_avanzar_a_me",
        "robot_telemetry_08_posicion_inicial_con_rumbo_frontal_0_0",
        "robot_telemetry_09_desviacion_positiva_hacia_objetivo_45_0_giro_",
        "robot_telemetry_10_desviacion_negativa_hacia_objetivo_45_0_giro_",
        "robot_telemetry_11_conflicto_cinematico_rumbo_alineado_pero_obst",
        "robot_telemetry_12_retorno_urgente_a_base_con_giro_inverso_143_1",
        "robot_telemetry_13_obstaculo_a_distancia_media_3_40m_en_lateral_",
        "robot_telemetry_14_telemetria_nominal_en_pasillo_recto_con_bater",
        "robot_telemetry_15_parada_en_punto_de_carga_d_obs_0_15m_bateria_"
    ],
    "semantic_linting": [
        "semantic_linting_01_consulta_sql_directa_en_componente_de_ui_con_",
        "semantic_linting_02_funcion_pura_modular_con_tipado_estricto_y_ma",
        "semantic_linting_03_mutacion_de_estado_global_concurrente_sin_loc",
        "semantic_linting_04_captura_silenciosa_de_excepciones_ocultando_e",
        "semantic_linting_05_bucle_anidado_o_n_procesando_colecciones_en_m",
        "semantic_linting_06_inversion_de_control_limpia_mediante_inyeccio",
        "semantic_linting_07_clave_api_de_produccion_codificada_en_texto_p",
        "semantic_linting_08_metodo_monolitico_dios_con_25_condiciones_if_",
        "semantic_linting_09_manejo_transaccional_seguro_con_bloque_try_fi",
        "semantic_linting_10_exposicion_directa_de_entidad_de_base_de_dato",
        "semantic_linting_11_deserializacion_insegura_con_pickle_de_datos_",
        "semantic_linting_12_arquitectura_hexagonal_desacoplando_dominio_d",
        "semantic_linting_13_dependencia_circular_entre_modulo_de_dominio_",
        "semantic_linting_14_implementacion_robusta_de_patron_circuit_brea",
        "semantic_linting_15_falta_de_sanitizacion_en_ejecucion_de_comando"
    ],
    "support_fanout": [
        "support_fanout_16_storefront_cs_agent_dana_m",
        "support_fanout_01_cobro_doble_y_error_de_login_facturacion_frus",
        "support_fanout_02_bug_critico_bloqueante_en_pasarela_de_pago_co",
        "support_fanout_03_feature_request_amable_exportar_a_csv",
        "support_fanout_04_solicitud_explicita_de_devolucion_inmediata",
        "support_fanout_05_problema_de_autenticacion_2fa_en_dispositivo_",
        "support_fanout_06_crash_al_subir_archivos_adjuntos_superiores_a",
        "support_fanout_07_pregunta_sobre_planes_enterprise_y_descuento_",
        "support_fanout_08_solicitud_de_eliminacion_de_cuenta_gdpr_priva",
        "support_fanout_09_fallo_intermitente_de_webhook_con_codigo_504_",
        "support_fanout_10_peticion_de_integracion_con_slack_y_microsoft",
        "support_fanout_11_factura_erronea_con_numero_de_cif_nif_incorre",
        "support_fanout_12_bloqueo_de_cuenta_tras_3_intentos_fallidos_de",
        "support_fanout_13_error_visual_cosmetico_en_modo_oscuro_en_safa",
        "support_fanout_14_retraso_inaceptable_en_respuesta_de_soporte_p",
        "support_fanout_15_consulta_sobre_limites_de_api_de_rate_limitin"
    ]
};

// In-memory session cache for loaded examples
const exampleCache = new Map();

/**
 * Loads state.json and query.json for a given use case and preset index.
 *
 * @param {string} useCaseId - e.g. "support_fanout"
 * @param {number} [presetIndex=0] - 0-based index (0 to 14)
 * @returns {Promise<{ folder: string, basePath: string, state: object, query: object }>}
 */
export async function loadCaseExample(useCaseId, presetIndex = 0) {
    const folders = CASE_EXAMPLES_MANIFEST[useCaseId];
    if (!folders || folders.length === 0) {
        throw new Error(`Unknown use case id: ${useCaseId}`);
    }

    let safeIdx = 0;
    if (typeof presetIndex === "string") {
        const found = folders.indexOf(presetIndex);
        safeIdx = found >= 0 ? found : (parseInt(presetIndex, 10) || 0);
    } else {
        safeIdx = Math.max(0, Math.min(presetIndex, folders.length - 1));
    }
    const folder = folders[safeIdx];
    const cacheKey = `${useCaseId}_${safeIdx}`;

    if (exampleCache.has(cacheKey)) {
        return exampleCache.get(cacheKey);
    }

    const basePath = `case-use-examples/${useCaseId}/${folder}`;

    try {
        const [stateRes, queryRes] = await Promise.all([
            fetch(`${basePath}/state.json`),
            fetch(`${basePath}/query.json`)
        ]);

        if (!stateRes.ok) {
            throw new Error(`Failed to fetch state.json: HTTP ${stateRes.status}`);
        }
        if (!queryRes.ok) {
            throw new Error(`Failed to fetch query.json: HTTP ${queryRes.status}`);
        }

        const stateJson = await stateRes.json();
        const queryJson = await queryRes.json();

        const result = {
            folder,
            basePath,
            state: stateJson,
            query: queryJson
        };

        exampleCache.set(cacheKey, result);
        return result;
    } catch (err) {
        console.warn(`[case-examples-loader] Fetch failed for ${basePath}, falling back to local fallback:`, err);
        throw err;
    }
}

/**
 * Clears the session cache if needed.
 */
export function clearExampleCache() {
    exampleCache.clear();
}
