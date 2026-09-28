"""Merges free-text `demand_model` variants that name the same underlying
model, the same fragmentation problem commodity_domain had. Only the
confident, unambiguous merges live here -- e.g. five different RA-written
descriptions of the Zero-Bounded Exponential model. Anything describing a
statistical *estimation method* (nonlinear/Bayesian mixed-effects, etc.)
rather than a specific named demand equation is left alone, since it's not
clear those belong in the same taxonomy as "which curve was fit" -- that's
a modeling-conflation question for the PI, not a wording cleanup.
"""

DEMAND_MODEL_ALIASES = {
    # Zero-Bounded Exponential (ZBE/ZBEn) -- a refinement of the Hursh &
    # Silberberg exponential model, distinct from Koffarnus's exponentiated
    # fix. Five RA-written descriptions of the same model family.
    "ZBEn model (revised Hursh & Silberberg exponential)": "Zero-Bounded Exponential model (ZBE/ZBEn)",
    "Other (normalized zero-bounded exponential model [ZBEn])": "Zero-Bounded Exponential model (ZBE/ZBEn)",
    "Other (Zero-Bounded Model of Demand)": "Zero-Bounded Exponential model (ZBE/ZBEn)",
    "Other (Zero-bounded exponential (ZBE) model)": "Zero-Bounded Exponential model (ZBE/ZBEn)",
    "Other (normalized Zero-Bounded Exponential model with added power function parameter)": "Zero-Bounded Exponential model (ZBE/ZBEn)",
    # Hursh & Winger (1995) demand curve normalization equation.
    "Other (Hursh & Winger’s 1995 demand curve normalization equation)": "Hursh & Winger (1995) normalization",
    "Other (Hursh and Winger normalized demand equation)": "Hursh & Winger (1995) normalization",
    "Other (Winger and Hursh, 1995)": "Hursh & Winger (1995) normalization",
    # Hursh et al. (1988) logarithmic model -- predates the exponential
    # (1986/2008) and exponentiated (Koffarnus) models.
    "Other (Hursh et al., 1988 logarithm model)": "Hursh et al. (1988) logarithmic model",
    "Other (Hursh et al. 1988 logarithmic demand curve equation)": "Hursh et al. (1988) logarithmic model",
}
