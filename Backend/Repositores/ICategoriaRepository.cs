using financeApp.Models;

namespace financeApp.Repositories
{
    public interface ICategoriaRepository
    {
        List<Categoria> Listar();
        Categoria? BuscarPorId(int id);
        void Adicionar(Categoria categoria);
        void Atualizar(Categoria categoria);
        void Deletar(int id);
    }
}
