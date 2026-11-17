from __future__ import annotations

from dataclasses import dataclass
import logging
from typing import Optional, Sequence, Tuple

import numpy as np

logger = logging.getLogger(__name__)


@dataclass
class AffineModel:
    """2D Affine transformation model parameters."""
    a: float = 0.0
    b: float = 0.0
    tx: float = 0.0
    c: float = 0.0
    d: float = 0.0
    ty: float = 0.0
    rmse: float = float("inf")
    is_valid: bool = False


def fit_affine_transform(
    src_points: Sequence[Sequence[float]],
    dst_points: Sequence[Sequence[float]],
    max_rmse_threshold: float = 25.0,
) -> AffineModel:
    """Fit a 2D affine transform mapping src_points (OpenF1) to dst_points (FastF1 SVG).

    Maps: [x_dst, y_dst] = [x_src, y_src, 1] @ M
    where M is a 3x2 matrix.
    """
    if len(src_points) < 3 or len(src_points) != len(dst_points):
        logger.warning("Insufficient or mismatched points for affine fitting (%d vs %d)", len(src_points), len(dst_points))
        return AffineModel(rmse=float("inf"), is_valid=False)

    try:
        src_arr = np.array(src_points, dtype=np.float64)
        dst_arr = np.array(dst_points, dtype=np.float64)

        if src_arr.shape[1] != 2 or dst_arr.shape[1] != 2:
            return AffineModel(rmse=float("inf"), is_valid=False)

        # Build augmented matrix [x, y, 1]
        n = src_arr.shape[0]
        a_matrix = np.column_stack([src_arr, np.ones(n, dtype=np.float64)])

        # Least squares solve
        m_matrix, residuals, rank, _ = np.linalg.lstsq(a_matrix, dst_arr, rcond=None)

        if rank < 3:
            logger.warning("Affine matrix rank %d < 3 (collinear points)", rank)
            return AffineModel(rmse=float("inf"), is_valid=False)

        # Compute RMSE
        predicted = a_matrix @ m_matrix
        diff = predicted - dst_arr
        rmse = float(np.sqrt(np.mean(np.sum(diff ** 2, axis=1))))

        a = float(m_matrix[0, 0])
        c = float(m_matrix[0, 1])
        b = float(m_matrix[1, 0])
        d = float(m_matrix[1, 1])
        tx = float(m_matrix[2, 0])
        ty = float(m_matrix[2, 1])

        is_valid = bool(rmse <= max_rmse_threshold and not np.isnan(rmse))
        if not is_valid:
            logger.warning("Affine fit rejected: RMSE %.2f exceeds threshold %.2f", rmse, max_rmse_threshold)

        return AffineModel(
            a=a,
            b=b,
            tx=tx,
            c=c,
            d=d,
            ty=ty,
            rmse=rmse,
            is_valid=is_valid,
        )
    except Exception as exc:
        logger.warning("Error fitting affine transform: %s", exc)
        return AffineModel(rmse=float("inf"), is_valid=False)


def transform_point(
    point: Sequence[float] | Tuple[float, float],
    model: AffineModel,
) -> Optional[Tuple[float, float]]:
    """Transform a single 2D point using the fitted AffineModel."""
    if not model.is_valid:
        return None
    try:
        x, y = float(point[0]), float(point[1])
        x_prime = model.a * x + model.b * y + model.tx
        y_prime = model.c * x + model.d * y + model.ty
        return (round(x_prime, 3), round(y_prime, 3))
    except Exception as exc:
        logger.debug("Error transforming point: %s", exc)
        return None
