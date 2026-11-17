import pytest
from tools.track_transform import AffineModel, fit_affine_transform, transform_point


def test_affine_transform_exact_translation_scaling():
    # 4 points: square of size 10 at (0, 0)
    src_points = [(0.0, 0.0), (10.0, 0.0), (10.0, 10.0), (0.0, 10.0)]
    # Target: scale by 2.0, translate by (+100, +50)
    # (0, 0) -> (100, 50)
    # (10, 0) -> (120, 50)
    # (10, 10) -> (120, 70)
    # (0, 10) -> (100, 70)
    dst_points = [(100.0, 50.0), (120.0, 50.0), (120.0, 70.0), (100.0, 70.0)]

    model = fit_affine_transform(src_points, dst_points)
    assert model.is_valid
    assert model.rmse < 1e-3

    # Transform center point (5, 5) -> should be (110, 60)
    transformed = transform_point((5.0, 5.0), model)
    assert transformed is not None
    assert abs(transformed[0] - 110.0) < 0.1
    assert abs(transformed[1] - 60.0) < 0.1


def test_affine_transform_insufficient_points():
    # < 3 points cannot uniquely determine 2D affine (6 parameters)
    src_points = [(0.0, 0.0), (1.0, 1.0)]
    dst_points = [(10.0, 10.0), (20.0, 20.0)]

    model = fit_affine_transform(src_points, dst_points)
    assert not model.is_valid
    assert transform_point((0.0, 0.0), model) is None


def test_affine_transform_high_residual_rejection():
    # Non-linear / noisy points that cannot fit an affine map
    src_points = [(0.0, 0.0), (10.0, 0.0), (10.0, 10.0), (0.0, 10.0), (5.0, 5.0)]
    # Wildly inconsistent target points
    dst_points = [(0.0, 0.0), (100.0, 500.0), (-200.0, 30.0), (400.0, -100.0), (0.0, 800.0)]

    model = fit_affine_transform(src_points, dst_points, max_rmse_threshold=20.0)
    assert not model.is_valid
    assert model.rmse > 20.0
    assert transform_point((5.0, 5.0), model) is None


def test_affine_transform_calibration_fixture():
    from app.schemas.live import load_replay_fixture
    fixture = load_replay_fixture()
    calib = fixture.get("sample_calibration_points")
    assert calib is not None

    model = fit_affine_transform(calib["openf1_points"], calib["fastf1_points"], max_rmse_threshold=5.0)
    assert model.is_valid
    pt = transform_point(calib["openf1_points"][0], model)
    assert pt is not None
    # Check that projected point is close to target
    assert abs(pt[0] - calib["fastf1_points"][0][0]) < 2.0
    assert abs(pt[1] - calib["fastf1_points"][0][1]) < 2.0
