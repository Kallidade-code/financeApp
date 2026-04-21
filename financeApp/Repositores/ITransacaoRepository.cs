using financeApp.Models;

namespace financeApp.Repositories
{
    public interface ITransacaoRepository
    {
        List<Transacao> Listar();
        Transacao? BuscarPorId(int id);
        void Adicionar(Transacao transacao);
        void Atualizar(Transacao transacao);
        void Deletar(int id);
        decimal ObterSaldo();
        List<Transacao> FiltrarPorTipo(TipoTransacao tipo);
        Dictionary<string, decimal> TotalPorCategoria();
    }
}
