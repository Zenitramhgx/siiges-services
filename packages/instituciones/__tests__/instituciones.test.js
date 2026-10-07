const findAllInstituciones = require('../src/useCases/db/instituciones/find-all.instituciones.use-cases');

describe('@siiges-services/instituciones', () => {
  it('returns paginated metadata and page data for the institutions list', async () => {
    const mockFindAllInstitucionesQuery = jest.fn().mockResolvedValue({
      rows: [{ id: 1, nombre: 'Universidad A', ratificacionesNombre: [] }],
      count: 42,
    });
    const mockFindPlantelesQuery = jest.fn();

    const result = await findAllInstituciones(
      mockFindAllInstitucionesQuery,
      mockFindPlantelesQuery,
    )({
      queryParams: {
        page: 1,
        limit: 10,
        sortBy: 'nombre',
        sortOrder: 'asc',
        search: 'universidad',
      },
    });

    expect(result).toEqual(expect.objectContaining({
      data: expect.any(Array),
      pagination: expect.objectContaining({
        page: 1,
        limit: 10,
        total: 42,
        totalPages: 5,
        sortBy: 'nombre',
        sortOrder: 'asc',
        search: 'universidad',
      }),
    }));
  });

  it('applies the authorization filter in the DB query and uses server-side pagination', async () => {
    const mockFindAllInstitucionesQuery = jest.fn().mockResolvedValue({
      rows: [{ id: 2, nombre: 'Universidad B', ratificacionesNombre: [{ esNombreAutorizado: true }] }],
      count: 1,
    });
    const mockFindPlantelesQuery = jest.fn();

    const result = await findAllInstituciones(
      mockFindAllInstitucionesQuery,
      mockFindPlantelesQuery,
    )({
      queryParams: {
        esNombreAutorizado: true,
        page: 1,
        limit: 5,
        sortBy: 'nombre',
        sortOrder: 'asc',
      },
    });

    expect(mockFindAllInstitucionesQuery).toHaveBeenCalledWith(
      null,
      expect.objectContaining({
        include: [expect.objectContaining({
          association: 'ratificacionesNombre',
          where: { esNombreAutorizado: true },
        })],
        pagination: {
          limit: 5,
          offset: 5,
          distinct: true,
        },
      }),
    );

    expect(result).toEqual({
      data: [{ id: 2, nombre: 'Universidad B', ratificacionesNombre: [{ esNombreAutorizado: true }] }],
      pagination: {
        page: 1,
        limit: 5,
        total: 1,
        totalPages: 1,
        sortBy: 'nombre',
        sortOrder: 'asc',
        search: '',
      },
    });
  });
});
