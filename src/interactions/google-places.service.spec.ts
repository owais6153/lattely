import type { ConfigService } from '@nestjs/config';

import { GooglePlacesService } from './google-places.service';

describe('GooglePlacesService photos', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('resolves a place photo without exposing the API key', async () => {
    const config = {
      get: jest.fn((name: string) => {
        if (name === 'GOOGLE_PLACES_API_KEY') return 'private-key';
        if (name === 'GOOGLE_PLACES_TIMEOUT_MS') return '1000';
        return undefined;
      }),
    };
    const fetchMock = jest
      .spyOn(global, 'fetch')
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            photos: [
              {
                name: 'places/place-1/photos/photo-1',
                authorAttributions: [
                  { displayName: 'Coffee Photographer', uri: 'https://example.com/author' },
                ],
              },
            ],
          }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ photoUri: 'https://images.example.com/coffee.jpg' }), {
          status: 200,
        }),
      );
    const service = new GooglePlacesService(
      config as unknown as ConfigService,
    );

    await expect(service.getPlacePhoto('place-1')).resolves.toEqual({
      url: 'https://images.example.com/coffee.jpg',
      attributions: [
        {
          displayName: 'Coffee Photographer',
          uri: 'https://example.com/author',
          photoUri: null,
        },
      ],
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0][0]).not.toContain('private-key');
    expect(fetchMock.mock.calls[1][0]).not.toContain('private-key');
  });

  it('returns no photo when Google has no venue photo', async () => {
    const config = {
      get: jest.fn((name: string) =>
        name === 'GOOGLE_PLACES_API_KEY' ? 'private-key' : '1000',
      ),
    };
    jest.spyOn(global, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ photos: [] }), { status: 200 }),
    );
    const service = new GooglePlacesService(
      config as unknown as ConfigService,
    );

    await expect(service.getPlacePhoto('place-1')).resolves.toBeNull();
  });
});
